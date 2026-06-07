import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getAreas,
	getItemTypes,
	getProjects,
	getStatuses,
	projectFlowApiRequest,
} from './GenericFunctions';

export class ProjectFlow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ProjectFlow',
		name: 'projectFlow',
		icon: 'file:projectflow.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage ProjectFlow items, comments and attachments',
		defaults: {
			name: 'ProjectFlow',
		},
		inputs: ['main'],
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Item', value: 'item' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Attachment', value: 'attachment' },
				],
				default: 'item',
			},

			// ----------------------------------- Item operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['item'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create an item' },
					{ name: 'Delete (Archive)', value: 'delete', action: 'Archive an item' },
					{ name: 'Get', value: 'get', action: 'Get an item' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many items' },
					{ name: 'Move', value: 'move', action: 'Move an item to a status' },
					{ name: 'Search', value: 'search', action: 'Search items' },
					{ name: 'Update', value: 'update', action: 'Update an item' },
				],
				default: 'create',
			},

			// ----------------------------------- Comment operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['comment'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a comment' },
					{ name: 'Delete', value: 'delete', action: 'Delete a comment' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many comments for an item' },
					{ name: 'Update', value: 'update', action: 'Update a comment' },
				],
				default: 'create',
			},

			// ----------------------------------- Attachment operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['attachment'] } },
				options: [
					{ name: 'Upload', value: 'upload', action: 'Upload an attachment to an item' },
					{ name: 'Download', value: 'download', action: 'Download an attachment' },
					{ name: 'Delete', value: 'delete', action: 'Delete an attachment' },
				],
				default: 'upload',
			},

			// ----------------------------------- Project selector (item create / getAll, comment create)
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProjects' },
				required: true,
				default: '',
				description:
					'Choose a project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create', 'getAll', 'search'],
					},
				},
			},

			// ----------------------------------- Item ID (get/update/move/delete)
			{
				displayName: 'Item ID',
				name: 'itemId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['get', 'update', 'move', 'delete'],
					},
				},
			},

			// ----------------------------------- Item: Create — title required
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['item'], operation: ['create'] } },
			},

			// ----------------------------------- Item: Create — additional fields
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['item'], operation: ['create'] } },
				options: [
					{
						displayName: 'Area Names or IDs',
						name: 'areaIds',
						type: 'multiOptions',
						typeOptions: { loadOptionsMethod: 'getAreas', loadOptionsDependsOn: ['projectId'] },
						default: [],
						description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{ displayName: 'Assigned User ID', name: 'assignedToId', type: 'string', default: '' },
					{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 4 }, default: '' },
					{ displayName: 'Draft', name: 'draft', type: 'boolean', default: false },
					{ displayName: 'Due Date', name: 'dueDate', type: 'dateTime', default: '' },
					{ displayName: 'Effort (1-5)', name: 'effort', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 3 },
					{ displayName: 'Labels', name: 'labels', type: 'string', typeOptions: { multipleValues: true }, default: [] },
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
							{ name: 'Urgent', value: 'urgent' },
						],
						default: 'medium',
					},
					{
						displayName: 'Status Name or ID',
						name: 'status',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getStatuses', loadOptionsDependsOn: ['projectId'] },
						default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Type Name or ID',
						name: 'type',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getItemTypes', loadOptionsDependsOn: ['projectId'] },
						default: 'feature',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{ displayName: 'Value (1-5)', name: 'value', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 3 },
				],
			},

			// ----------------------------------- Item: Update — fields
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['item'], operation: ['update'] } },
				options: [
					{ displayName: 'Archived', name: 'archived', type: 'boolean', default: false },
					{ displayName: 'Assigned User ID', name: 'assignedToId', type: 'string', default: '' },
					{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 4 }, default: '' },
					{ displayName: 'Due Date', name: 'dueDate', type: 'dateTime', default: '' },
					{ displayName: 'Effort (1-5)', name: 'effort', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 3 },
					{ displayName: 'Labels', name: 'labels', type: 'string', typeOptions: { multipleValues: true }, default: [] },
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
							{ name: 'Urgent', value: 'urgent' },
						],
						default: 'medium',
					},
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{ displayName: 'Value (1-5)', name: 'value', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 3 },
				],
			},

			// ----------------------------------- Item: Move
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Target status key to move the item to',
				displayOptions: { show: { resource: ['item'], operation: ['move'] } },
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				description: 'Position within the target column',
				displayOptions: { show: { resource: ['item'], operation: ['move'] } },
			},

			// ----------------------------------- Item: Search
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['item'], operation: ['search'] } },
			},

			// ----------------------------------- Return all / limit (getAll + search)
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				description: 'Whether to return all results or only up to a given limit',
				default: false,
				displayOptions: { show: { resource: ['item'], operation: ['getAll', 'search'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: { resource: ['item'], operation: ['getAll', 'search'], returnAll: [false] },
				},
			},

			// ----------------------------------- Comment fields
			{
				displayName: 'Item ID',
				name: 'itemId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['comment'], operation: ['getAll', 'create'] } },
			},
			{
				displayName: 'Comment ID',
				name: 'commentId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['comment'], operation: ['update', 'delete'] } },
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 3 },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['comment'], operation: ['create', 'update'] } },
			},
			{
				displayName: 'Type',
				name: 'commentType',
				type: 'options',
				options: [
					{ name: 'Comment', value: 'comment' },
					{ name: 'Question', value: 'question' },
					{ name: 'Answer', value: 'answer' },
				],
				default: 'comment',
				displayOptions: { show: { resource: ['comment'], operation: ['create'] } },
			},

			// ----------------------------------- Attachment fields
			{
				displayName: 'Item ID',
				name: 'itemId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['attachment'] } },
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the input binary field containing the file to upload',
				displayOptions: { show: { resource: ['attachment'], operation: ['upload'] } },
			},
			{
				displayName: 'Attachment ID',
				name: 'attachmentId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['attachment'], operation: ['download', 'delete'] } },
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the output binary field to put the downloaded file in',
				displayOptions: { show: { resource: ['attachment'], operation: ['download'] } },
			},
		],
	};

	methods = {
		loadOptions: {
			getProjects,
			getStatuses,
			getItemTypes,
			getAreas,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};

				if (resource === 'item') {
					if (operation === 'create') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = { projectId, title, ...additional };
						responseData = await projectFlowApiRequest.call(this, 'POST', '/api/v1/items', body);
					} else if (operation === 'get') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await projectFlowApiRequest.call(this, 'GET', `/api/v1/items/${itemId}`);
					} else if (operation === 'getAll') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/items/project/${projectId}`,
						);
						responseData = limitResults.call(this, responseData as IDataObject[], i);
					} else if (operation === 'update') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/items/${itemId}`,
							body,
						);
					} else if (operation === 'move') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const status = this.getNodeParameter('status', i) as string;
						const order = this.getNodeParameter('order', i) as number;
						const body: IDataObject = {};
						if (status) body.status = status;
						if (order !== undefined) body.order = order;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/items/${itemId}/move`,
							body,
						);
					} else if (operation === 'delete') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/items/${itemId}`,
						);
						if (!responseData || Object.keys(responseData).length === 0) {
							responseData = { success: true, id: itemId };
						}
					} else if (operation === 'search') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const query = this.getNodeParameter('query', i) as string;
						responseData = await projectFlowApiRequest.call(this, 'GET', '/api/v1/items/search', {}, {
							projectId,
							q: query,
						});
						if (Array.isArray(responseData)) {
							responseData = limitResults.call(this, responseData, i);
						}
					}
				} else if (resource === 'comment') {
					if (operation === 'getAll') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/comments/item/${itemId}`,
						);
					} else if (operation === 'create') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const type = this.getNodeParameter('commentType', i) as string;
						responseData = await projectFlowApiRequest.call(this, 'POST', '/api/v1/comments', {
							itemId,
							content,
							type,
						});
					} else if (operation === 'update') {
						const commentId = this.getNodeParameter('commentId', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/comments/${commentId}`,
							{ content },
						);
					} else if (operation === 'delete') {
						const commentId = this.getNodeParameter('commentId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/comments/${commentId}`,
						);
						if (!responseData || Object.keys(responseData).length === 0) {
							responseData = { success: true, id: commentId };
						}
					}
				} else if (resource === 'attachment') {
					const itemId = this.getNodeParameter('itemId', i) as string;
					if (operation === 'upload') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						responseData = await projectFlowApiRequest.call(
							this,
							'POST',
							`/api/v1/items/${itemId}/attachments`,
							{},
							{},
							{
								formData: {
									files: {
										value: buffer,
										options: {
											filename: binaryData.fileName ?? 'file',
											contentType: binaryData.mimeType,
										},
									},
								},
								json: true,
							},
						);
					} else if (operation === 'download') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const fileBuffer = (await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/items/${itemId}/attachments/${attachmentId}/download`,
							{},
							{},
							{ json: false, encoding: null },
						)) as Buffer;
						const binary = await this.helpers.prepareBinaryData(Buffer.from(fileBuffer));
						returnData.push({
							json: { itemId, attachmentId },
							binary: { [binaryPropertyName]: binary },
							pairedItem: { item: i },
						});
						continue;
					} else if (operation === 'delete') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/items/${itemId}/attachments/${attachmentId}`,
						);
						if (!responseData || Object.keys(responseData).length === 0) {
							responseData = { success: true, id: attachmentId };
						}
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

function limitResults(
	this: IExecuteFunctions,
	data: IDataObject[],
	itemIndex: number,
): IDataObject[] {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
	if (returnAll || !Array.isArray(data)) return data;
	const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
	return data.slice(0, limit);
}
