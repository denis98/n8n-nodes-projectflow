import { createHmac, timingSafeEqual } from 'crypto';
import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { getProjects, projectFlowApiRequest } from './GenericFunctions';

export class ProjectFlowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ProjectFlow Trigger',
		name: 'projectFlowTrigger',
		icon: 'file:projectflow.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when a ProjectFlow project event occurs',
		defaults: {
			name: 'ProjectFlow Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'projectFlowTokenApi',
				required: true,
				displayOptions: { show: { authentication: ['tokenApi'] } },
			},
			{
				name: 'projectFlowOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth2'] } },
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'Personal Token', value: 'tokenApi' },
					{ name: 'OAuth2', value: 'oAuth2' },
				],
				default: 'tokenApi',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProjects' },
				required: true,
				default: '',
				description:
					'The project to watch. You must be the project owner to register webhooks. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['item.created'],
				options: [
					// Alphabetical, as n8n's lint requires. Resolved and Reopened were
					// missing until 0.2.0, so a workflow could not react to FEAT-183's
					// resolution flow — and a new webhook event is the declared
					// extension path for automation, which makes a stale event list the
					// one thing here that must not happen. 0.3.0 follows the server's
					// catalog (FEAT-484): comments, assignment, wiki, discussions, time
					// entries, canvases. Comment and discussion text is in the payload,
					// and only this project's webhooks get it.
					{ name: 'Canvas Created', value: 'canvas.created' },
					{ name: 'Canvas Deleted', value: 'canvas.deleted' },
					{ name: 'Canvas Updated', value: 'canvas.updated' },
					{ name: 'Comment Created', value: 'comment.created' },
					{ name: 'Comment Deleted', value: 'comment.deleted' },
					{ name: 'Comment Updated', value: 'comment.updated' },
					{ name: 'Discussion Created', value: 'discussion.created' },
					{ name: 'Discussion Replied', value: 'discussion.replied' },
					{ name: 'Item Assigned', value: 'item.assigned' },
					{ name: 'Item Created', value: 'item.created' },
					{ name: 'Item Deleted', value: 'item.deleted' },
					{ name: 'Item Moved', value: 'item.moved' },
					{ name: 'Item Reopened', value: 'item.reopened' },
					{ name: 'Item Resolved', value: 'item.resolved' },
					{ name: 'Item Updated', value: 'item.updated' },
					{ name: 'Member Added', value: 'member.added' },
					{ name: 'Member Removed', value: 'member.removed' },
					{ name: 'Member Role Changed', value: 'member.roleChanged' },
					{ name: 'Project Archived', value: 'project.archived' },
					{ name: 'Project Moved', value: 'project.moved' },
					{ name: 'Project Owner Changed', value: 'project.ownerChanged' },
					{ name: 'Project Restored', value: 'project.restored' },
					{ name: 'Time Entry Created', value: 'worklog.created' },
					{ name: 'Wiki Page Created', value: 'wiki.created' },
					{ name: 'Wiki Page Deleted', value: 'wiki.deleted' },
					{ name: 'Wiki Page Published', value: 'wiki.published' },
					{ name: 'Wiki Page Updated', value: 'wiki.updated' },
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getProjects,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return webhookData.webhookId !== undefined;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const projectId = this.getNodeParameter('projectId') as string;
				const events = this.getNodeParameter('events') as string[];

				const response = (await projectFlowApiRequest.call(
					this,
					'POST',
					`/api/v1/projects/${projectId}/webhooks`,
					{ url: webhookUrl, events },
				)) as { id: string; secret: string };

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response.id;
				webhookData.secret = response.secret;
				webhookData.projectId = projectId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) return true;

				const projectId = webhookData.projectId as string;
				try {
					await projectFlowApiRequest.call(
						this,
						'DELETE',
						`/api/v1/projects/${projectId}/webhooks/${webhookData.webhookId}`,
					);
				} catch {
					return false;
				}
				delete webhookData.webhookId;
				delete webhookData.secret;
				delete webhookData.projectId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData() as IDataObject;
		const webhookData = this.getWorkflowStaticData('node');
		const secret = webhookData.secret as string | undefined;

		// Verify the HMAC-SHA256 signature against the raw body.
		const signature = (headers['x-webhook-signature'] as string) || '';
		if (secret) {
			const rawBody = JSON.stringify(req.body);
			const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
			const sigBuf = Buffer.from(signature);
			const expBuf = Buffer.from(expected);
			if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
				return { noWebhookResponse: true };
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
