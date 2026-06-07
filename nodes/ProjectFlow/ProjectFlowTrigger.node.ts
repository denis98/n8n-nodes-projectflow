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
		description: 'Starts a workflow when a ProjectFlow item event occurs',
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
					{ name: 'Item Created', value: 'item.created' },
					{ name: 'Item Updated', value: 'item.updated' },
					{ name: 'Item Moved', value: 'item.moved' },
					{ name: 'Item Deleted', value: 'item.deleted' },
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
