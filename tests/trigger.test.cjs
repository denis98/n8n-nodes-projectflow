const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { ProjectFlowTrigger } = require('../dist/nodes/ProjectFlow/ProjectFlowTrigger.node.js');
const { backendEvents, triggerEvents, compareEvents } = require('../scripts/check-events.cjs');

const newEvents = ['member.added', 'member.removed', 'member.roleChanged', 'project.ownerChanged', 'project.moved', 'project.archived', 'project.restored'];
const trigger = new ProjectFlowTrigger();

test('membership and project events are selectable exactly once in alphabetical order', () => {
  const options = trigger.description.properties.find(property => property.name === 'events').options;
  for (const event of newEvents) assert.equal(options.filter(option => option.value === event).length, 1);
  assert.deepEqual(options.map(option => option.name), [...options.map(option => option.name)].sort());
});
for (const event of newEvents) {
  test(`signed ${event} payload passes through without item fields`, async () => {
    const body = { event, timestamp: '2026-10-09T00:00:00.000Z', projectId: 'project-1',
      data: { change: event, projectId: 'project-1', projectTitle: 'Example', workspaceId: null,
        ...(event.startsWith('member.') || event === 'project.ownerChanged' ? { userId: 'user-1' } : {}),
        ...(event === 'member.added' || event === 'member.roleChanged' ? { role: 'member' } : {}),
        ...(event === 'member.roleChanged' ? { previousRole: 'reader' } : {}),
        ...(event === 'project.ownerChanged' ? { previousOwnerId: 'owner-1' } : {}),
        ...(event === 'project.moved' ? { fromWorkspaceId: 'workspace-1' } : {}),
      }, changes: [] };
    const secret = 'test-only-secret';
    const result = await trigger.webhook.call({
      getRequestObject: () => ({ body }),
      getHeaderData: () => ({ 'x-webhook-signature': createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex') }),
      getWorkflowStaticData: () => ({ secret }),
      helpers: { returnJsonArray: value => [{ json: value }] },
    });
    assert.deepEqual(result.workflowData, [[{ json: body }]]);
    assert.equal(result.workflowData[0][0].json.data.itemId, undefined);
  });
}
test('a forged membership delivery cannot start a workflow', async () => {
  const result = await trigger.webhook.call({
    getRequestObject: () => ({ body: { event: 'member.added', data: { userId: 'user-1' } } }),
    getHeaderData: () => ({ 'x-webhook-signature': 'forged' }),
    getWorkflowStaticData: () => ({ secret: 'test-only-secret' }),
    helpers: { returnJsonArray: () => { throw new Error('Must not execute'); } },
  });
  assert.deepEqual(result, { noWebhookResponse: true });
});
test('drift comparison reports missing, unsupported and duplicate choices', () => {
  assert.deepEqual(compareEvents(new Set(['member.added', 'project.moved']), ['member.added', 'member.added', 'unsupported']), {
    missing: ['project.moved'], unsupported: ['unsupported'], duplicates: ['member.added'],
  });
});
test('backend catalog reader follows the shared const array without evaluating TypeScript', () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'projectflow-events-'));
  try {
    mkdirSync(path.join(folder, 'src/types'), { recursive: true });
    writeFileSync(path.join(folder, 'src/types/enums.ts'), "export const WEBHOOK_EVENT_TYPES = ['member.added', 'project.moved'] as const;");
    writeFileSync(path.join(folder, 'src/types/webhook.ts'), 'export const WEBHOOK_EVENTS: ReadonlySet<string> = new Set<string>(WEBHOOK_EVENT_TYPES);');
    assert.deepEqual([...backendEvents(folder)], ['member.added', 'project.moved']);
    assert.equal(new Set(triggerEvents()).size, triggerEvents().length);
  } finally { rmSync(folder, { recursive: true }); }
});
