// Copied into the provided backend by scripts/check-live.cjs, then removed.
// Only the local network mapping is replaced: domain writes, auth, webhook
// registration, envelope/signature delivery and the n8n workflow are real.
import { writeFile } from 'node:fs/promises';
import { parse as parseFlatted } from 'flatted';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, expect, it, vi } from 'vitest';
import { createTestContext, destroyTestContext, signUpUser, createProject, inviteAndAccept, eventually, type TestContext } from '../helpers/setup.js';
import { closeServer } from '../helpers/loopback.js';
import { WEBHOOK_EVENTS } from '../../src/types/index.js';

const target = vi.hoisted(() => process.env.FEAT550_N8N_URL!);
vi.mock('../../src/lib/url-safety.js', async importOriginal => {
  const original = await importOriginal<typeof import('../../src/lib/url-safety.js')>();
  return { ...original, safeFetch: async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
    const requested = new URL(url);
    if (requested.hostname !== 'n8n.feat550.example') throw new Error('Unexpected outbound destination in local fixture');
    const response = await fetch(new URL(requested.pathname + requested.search, target), init);
    return { status: response.status, ok: response.ok, body: await response.text(), truncated: false };
  } };
});

let ctx: TestContext | undefined;
let exposed: Server | undefined;
let cookie = '';
let workflowId: string | undefined;
async function n8n(method: string, route: string, body?: unknown) {
  const response = await fetch(`${target}${route}`, { method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json() as { data?: any; message?: string };
  if (!response.ok) throw new Error(`n8n ${method} ${route}: ${response.status} ${json.message ?? ''}`);
  return json.data ?? json;
}
afterAll(async () => {
  if (workflowId) {
    await n8n('POST', `/rest/workflows/${workflowId}/deactivate`, {}).catch(() => {});
    if (ctx) await eventually(async () => (await ctx!.mongoose.models.Webhook.countDocuments({})) === 0, { timeout: 10_000, interval: 250 });
  }
  if (exposed) await closeServer(exposed);
  if (ctx) await destroyTestContext(ctx);
});

it('delivers a real membership change into the installed n8n trigger and removes its webhook on deactivation', async () => {
  const identity = { email: 'feat550-owner@example.test', password: 'LocalTestOnly!550', firstName: 'Local', lastName: 'Test' };
  const setup = await fetch(`${target}/rest/owner/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(identity) });
  if (setup.ok) cookie = setup.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  else {
    // Reuse only this fixture's account on its dedicated test instance.
    const login = await fetch(`${target}/rest/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrLdapLoginId: identity.email, password: identity.password }) });
    expect(login.status).toBe(200);
    cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  }
  expect(cookie).not.toBe('');
  const nodeTypes = await n8n('GET', '/types/nodes.json') as any[];
  const trigger = nodeTypes.find(node => node.displayName === 'ProjectFlow Trigger');
  expect(trigger).toBeTruthy();
  const options = trigger.properties.find((property: any) => property.name === 'events').options;
  expect(options.map((option: any) => option.value).sort()).toEqual([...WEBHOOK_EVENTS].sort());

  ctx = await createTestContext();
  exposed = ctx.express.listen(5501, '0.0.0.0');
  await new Promise<void>((resolve, reject) => { exposed!.once('listening', resolve); exposed!.once('error', reject); });
  const owner = await signUpUser(ctx.app, 'feat550-project-owner@example.test');
  const member = await signUpUser(ctx.app, 'feat550-project-member@example.test');
  const project = await createProject(ctx.app, owner, 'FEAT-550 local n8n');
  const token = await request(ctx.app).post('/api/v1/me/tokens').set('Cookie', owner.cookie)
    .send({ name: 'FEAT-550 temporary n8n', expiresAt: new Date(Date.now() + 300_000).toISOString() }).expect(201);
  const credential = await n8n('POST', '/rest/credentials', { name: 'FEAT-550 temporary ProjectFlow', type: 'projectFlowTokenApi',
    data: { baseUrl: 'http://host.docker.internal:5501', token: token.body.token } });
  const workflow = await n8n('POST', '/rest/workflows', { name: 'FEAT-550 member added',
    nodes: [{ id: randomUUID(), name: 'ProjectFlow Trigger', type: trigger.name, typeVersion: 1, position: [0, 0], webhookId: randomUUID(),
      parameters: { authentication: 'tokenApi', projectId: project.id, events: ['member.added'] },
      credentials: { projectFlowTokenApi: { id: credential.id, name: credential.name } } },
      { id: randomUUID(), name: 'Received', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [200, 0], parameters: {} }],
    connections: { 'ProjectFlow Trigger': { main: [[{ node: 'Received', type: 'main', index: 0 }]] } },
    settings: { executionOrder: 'v1', saveDataSuccessExecution: 'all' },
  });
  workflowId = workflow.id;
  await n8n('POST', `/rest/workflows/${workflowId}/activate`, { versionId: workflow.versionId });
  const registered = await eventually(async () => {
    const result = await request(ctx!.app).get(`/api/v1/projects/${project.id}/webhooks`).set('Cookie', owner.cookie).expect(200);
    return result.body.length ? result : undefined;
  }, { timeout: 30_000, interval: 250 });
  expect(registered).toBeTruthy();
  expect(registered!.body).toHaveLength(1);
  expect(registered!.body[0].events).toEqual(['member.added']);
  expect(new URL(registered!.body[0].url).hostname).toBe('n8n.feat550.example');
  await inviteAndAccept(ctx.app, owner, project.id, member);
  const execution = await eventually(async () => {
    const list = await n8n('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId }))}`);
    return list.results?.find((row: any) => row.status === 'success');
  }, { timeout: 30_000, interval: 250 });
  expect(execution).toBeTruthy();
  const detail = await n8n('GET', `/rest/executions/${execution.id}`);
  const executionData = typeof detail.data === 'string' ? parseFlatted(detail.data) : detail.data;
  const envelope = executionData.resultData.runData['ProjectFlow Trigger'][0].data.main[0][0].json;
  expect(envelope.event).toBe('member.added');
  expect(envelope.projectId).toBe(project.id);
  expect(envelope.data.userId).toBe(member.userId);
  expect(envelope.data.role).toBe('member');
  expect(envelope.data.itemId).toBeUndefined();
  expect(executionData.resultData.runData.Received[0].data.main[0][0].json).toEqual(envelope);
  await n8n('POST', `/rest/workflows/${workflowId}/deactivate`, {});
  const removed = await eventually(async () => {
    const result = await request(ctx!.app).get(`/api/v1/projects/${project.id}/webhooks`).set('Cookie', owner.cookie).expect(200);
    return result.body.length === 0 ? result : undefined;
  }, { timeout: 30_000, interval: 250 });
  expect(removed).toBeTruthy();
  expect(removed!.body).toHaveLength(0);
  const evidence = { runtime: 'n8n', eventsSelectable: options.length, executionId: execution.id,
    status: execution.status, envelope, webhookRemoved: true,
    network: 'Dedicated local backend and n8n; only safeFetch network routing maps n8n.feat550.example to loopback.' };
  await writeFile('/tmp/feat550-live-result.json', JSON.stringify(evidence, null, 2));
  console.log('Live n8n evidence:', JSON.stringify(evidence));
}, 90_000);
