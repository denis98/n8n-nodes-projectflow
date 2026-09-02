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

import {
	channelFields,
	channelOperations,
	discussionFields,
	discussionOperations,
	initiativeFields,
	initiativeOperations,
	replyFields,
	replyOperations,
	wikiFields,
	wikiOperations,
	worklogFields,
	worklogOperations,
} from './Descriptions';

export class ProjectFlow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ProjectFlow',
		name: 'projectFlow',
		icon: 'file:projectflow.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Manage ProjectFlow items, comments, attachments, channels, discussions, wiki pages, time entries and initiatives',
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
					{ name: 'Attachment', value: 'attachment' },
					{ name: 'Channel', value: 'channel' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Discussion Message', value: 'discussion' },
					{ name: 'Initiative', value: 'initiative' },
					{ name: 'Item', value: 'item' },
					{ name: 'Thread Reply', value: 'reply' },
					{ name: 'Wiki Page', value: 'wikiPage' },
					{ name: 'Work Log', value: 'worklog' },
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
					{ name: 'Archive', value: 'archive', action: 'Archive an item' },
					{ name: 'Create', value: 'create', action: 'Create an item' },
					{
						name: 'Delete',
						value: 'delete',
						action: 'Permanently delete an item',
						description:
							'Deletes the item for good, and removes it from other items\' dependencies. Use Archive to take it off the board while keeping it.',
					},
					{ name: 'Get', value: 'get', action: 'Get an item' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many items' },
					{ name: 'Move', value: 'move', action: 'Move an item to a status' },
					{ name: 'Restore', value: 'restore', action: 'Restore an archived item' },
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
						operation: ['get', 'update', 'move', 'delete', 'archive', 'restore'],
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
					{
						displayName: 'Custom Field Values (JSON)',
						name: 'customFieldValues',
						type: 'json',
						default: '{}',
						description:
							'Values for the project\'s custom fields, keyed by field ID. Unknown keys are refused.',
					},
					{
						displayName: 'Depends On Item IDs',
						name: 'dependsOn',
						type: 'string',
						typeOptions: { multipleValues: true },
						default: [],
						description: 'Items that must be finished first. A dependency cycle is refused.',
					},
					{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 4 }, default: '' },
					{ displayName: 'Draft', name: 'draft', type: 'boolean', default: false },
					{ displayName: 'Due Date', name: 'dueDate', type: 'dateTime', default: '' },
					{ displayName: 'Effort (1-5)', name: 'effort', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 3 },
					{
						displayName: 'Internal',
						name: 'internal',
						type: 'boolean',
						default: false,
						description: 'Whether to keep the item off the public changelog and board. It still counts towards progress.',
					},
					{
						displayName: 'Iteration ID',
						name: 'iterationId',
						type: 'string',
						default: '',
					},
					{ displayName: 'Labels', name: 'labels', type: 'string', typeOptions: { multipleValues: true }, default: [] },
					{
						displayName: 'Milestone ID',
						name: 'milestoneId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'number',
						default: 0,
						description: 'Position within its status column',
					},
					{
						displayName: 'Parent Item ID',
						name: 'parentId',
						type: 'string',
						default: '',
						description:
							'File this item under another one. May point at an item in a sibling project of the same workspace; at most three levels deep.',
					},
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
							// The backend enum is `critical`. 'urgent' was refused as an
							// invalid priority, so this option never worked.
							{ name: 'Critical', value: 'critical' },
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
						displayName: 'Story Points',
						name: 'storyPoints',
						type: 'options',
						options: [
							{ name: '1', value: 1 },
							{ name: '2', value: 2 },
							{ name: '3', value: 3 },
							{ name: '5', value: 5 },
							{ name: '8', value: 8 },
							{ name: '13', value: 13 },
							{ name: '21', value: 21 },
						],
						default: 3,
						description:
							'Fibonacci estimate. The backend refuses any other number. Needs story points switched on for the project.',
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
					{
						// A plain list rather than a picker: Update takes only an item ID,
						// so there is no project in scope to load the areas of.
						displayName: 'Area IDs',
						name: 'areaIds',
						type: 'string',
						typeOptions: { multipleValues: true },
						default: [],
						description: 'Replaces the item\'s areas. Area IDs are project-defined UUIDs.',
					},
					{ displayName: 'Assigned User ID', name: 'assignedToId', type: 'string', default: '' },
					{
						displayName: 'Custom Field Values (JSON)',
						name: 'customFieldValues',
						type: 'json',
						default: '{}',
						description: 'Values for the project\'s custom fields, keyed by field ID',
					},
					{
						displayName: 'Definition of Done (JSON)',
						name: 'dodChecklist',
						type: 'json',
						default: '{}',
						description:
							'The project\'s definition-of-done entries, keyed by entry ID, each true or false',
					},
					{
						displayName: 'Depends On Item IDs',
						name: 'dependsOn',
						type: 'string',
						typeOptions: { multipleValues: true },
						default: [],
						description: 'Replaces the dependency list. A cycle is refused.',
					},
					{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 4 }, default: '' },
					{
						displayName: 'Draft',
						name: 'draft',
						type: 'boolean',
						default: false,
					},
					{ displayName: 'Due Date', name: 'dueDate', type: 'dateTime', default: '' },
					{ displayName: 'Effort (1-5)', name: 'effort', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 3 },
					{
						displayName: 'Internal',
						name: 'internal',
						type: 'boolean',
						default: false,
						description: 'Whether to keep the item off the public changelog and board',
					},
					{
						displayName: 'Iteration ID',
						name: 'iterationId',
						type: 'string',
						default: '',
					},
					{ displayName: 'Labels', name: 'labels', type: 'string', typeOptions: { multipleValues: true }, default: [] },
					{
						displayName: 'Milestone ID',
						name: 'milestoneId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Parent Item ID',
						name: 'parentId',
						type: 'string',
						default: '',
						description: 'File this item under another one. Leave empty to detach it to the top level.',
					},
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
							// The backend enum is `critical`. 'urgent' was refused as an
							// invalid priority, so this option never worked.
							{ name: 'Critical', value: 'critical' },
						],
						default: 'medium',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'string',
						default: '',
						description: 'Status key. Changing status here does not reposition the item; use Move for that.',
					},
					{
						displayName: 'Story Points',
						name: 'storyPoints',
						type: 'number',
						default: 3,
						description:
							'One of 1, 2, 3, 5, 8, 13, 21. The backend refuses any other number. Needs story points switched on for the project.',
					},
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
						description: 'New item type, or a custom type ID',
					},
					{ displayName: 'Value (1-5)', name: 'value', type: 'number', typeOptions: { minValue: 1, maxValue: 5 }, default: 3 },
					{
						displayName: 'Watcher User IDs',
						name: 'watcherIds',
						type: 'string',
						typeOptions: { multipleValues: true },
						default: [],
						description: 'Replaces the watcher list. Watchers are notified of every change.',
					},
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

			// ----------------------------------- Resources added in 0.2.0
			channelOperations,
			...channelFields,
			discussionOperations,
			...discussionFields,
			replyOperations,
			...replyFields,
			wikiOperations,
			...wikiFields,
			worklogOperations,
			...worklogFields,
			initiativeOperations,
			...initiativeFields,
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
						const body: IDataObject = {
							projectId,
							title,
							...parseJsonFields.call(this, additional, i),
						};
						responseData = await projectFlowApiRequest.call(this, 'POST', '/api/v1/items', body);
					} else if (operation === 'archive') {
						// Archiving is a PATCH, not the DELETE below: the board keeps the
						// item and its history, it just stops showing it.
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/items/${itemId}`,
							{ archived: true },
						);
					} else if (operation === 'restore') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/items/${itemId}`,
							{ archived: false },
						);
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
						const body = parseJsonFields.call(
							this,
							this.getNodeParameter('updateFields', i) as IDataObject,
							i,
						);
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
						// The endpoint caps results itself — 20 by default, 100 at most.
						// Without passing a limit, "Return All" could never yield more
						// than 20 and the extra rows were never requested in the first
						// place.
						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
						const limit = returnAll
							? SEARCH_MAX_LIMIT
							: Math.min(this.getNodeParameter('limit', i, 50) as number, SEARCH_MAX_LIMIT);
						responseData = await projectFlowApiRequest.call(this, 'GET', '/api/v1/items/search', {}, {
							projectId,
							q: query,
							limit,
						});
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
				} else if (resource === 'channel') {
					if (operation === 'getAll') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const includeArchived = this.getNodeParameter('includeArchived', i, false) as boolean;
						// Sent only when true: the query schema coerces with
						// `z.coerce.boolean()`, where the string "false" is a non-empty
						// string and therefore true.
						const qs: IDataObject = includeArchived ? { includeArchived: 'true' } : {};
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/channels/project/${projectId}`,
							{},
							qs,
						);
					} else if (operation === 'overview') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/channels/${channelId}/overview`,
						);
					} else if (operation === 'create') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(this, 'POST', '/api/v1/channels', {
							projectId,
							name,
							...additional,
						});
					} else if (operation === 'update') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/channels/${channelId}`,
							body,
						);
					} else if (operation === 'markRead') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'POST',
							`/api/v1/channels/${channelId}/read`,
						);
					} else if (operation === 'delete') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/channels/${channelId}`,
						);
						responseData = emptyToSuccess(responseData, channelId);
					}
				} else if (resource === 'discussion') {
					if (operation === 'getAll') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/discussions/project/${projectId}`,
							{},
							filters,
						);
					} else if (operation === 'get') {
						const discussionId = this.getNodeParameter('discussionId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/discussions/${discussionId}`,
						);
					} else if (operation === 'create') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						const bodyText = this.getNodeParameter('body', i, '') as string;
						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						const payload: IDataObject = { projectId, channelId, ...additional };
						if (bodyText) payload.body = bodyText;
						responseData = await projectFlowApiRequest.call(
							this,
							'POST',
							'/api/v1/discussions',
							payload,
						);
					} else if (operation === 'update') {
						const discussionId = this.getNodeParameter('discussionId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/discussions/${discussionId}`,
							body,
						);
					} else if (operation === 'convertItem') {
						const discussionId = this.getNodeParameter('discussionId', i) as string;
						const body = this.getNodeParameter('convertFields', i, {}) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'POST',
							`/api/v1/discussions/${discussionId}/convert-item`,
							body,
						);
					} else if (operation === 'delete') {
						const discussionId = this.getNodeParameter('discussionId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/discussions/${discussionId}`,
						);
						responseData = emptyToSuccess(responseData, discussionId);
					}
				} else if (resource === 'reply') {
					if (operation === 'getAll') {
						const discussionId = this.getNodeParameter('discussionId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/discussions/${discussionId}/posts`,
						);
					} else if (operation === 'create') {
						const discussionId = this.getNodeParameter('discussionId', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'POST',
							`/api/v1/discussions/${discussionId}/posts`,
							{ content, ...additional },
						);
					} else if (operation === 'update') {
						const postId = this.getNodeParameter('postId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/discussions/posts/${postId}`,
							body,
						);
					} else if (operation === 'delete') {
						const postId = this.getNodeParameter('postId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/discussions/posts/${postId}`,
						);
						responseData = emptyToSuccess(responseData, postId);
					}
				} else if (resource === 'wikiPage') {
					if (operation === 'getAll') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const wikiType = this.getNodeParameter('wikiType', i, 'page') as string;
						// `page` is what switches the endpoint from a bare array to a
						// counted envelope, so it is always sent and the rows unwrapped.
						const result = (await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/wiki-pages/project/${projectId}`,
							{},
							{ type: wikiType, page: 1, limit: 100 },
						)) as IDataObject;
						responseData = (result.pages as IDataObject[]) ?? [];
					} else if (operation === 'get') {
						const pageId = this.getNodeParameter('pageId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/wiki-pages/${pageId}`,
						);
					} else if (operation === 'search') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const query = this.getNodeParameter('query', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/wiki-pages/project/${projectId}/search`,
							{},
							{ q: query },
						);
					} else if (operation === 'create') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const wikiType = this.getNodeParameter('wikiType', i, 'page') as string;
						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(this, 'POST', '/api/v1/wiki-pages', {
							projectId,
							title,
							type: wikiType,
							...additional,
						});
					} else if (operation === 'update') {
						const pageId = this.getNodeParameter('pageId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/wiki-pages/${pageId}`,
							body,
						);
					} else if (operation === 'publish') {
						const pageId = this.getNodeParameter('pageId', i) as string;
						const body = this.getNodeParameter('publishFields', i, {}) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'POST',
							`/api/v1/wiki-pages/${pageId}/publish`,
							body,
						);
					} else if (operation === 'getVersions') {
						const pageId = this.getNodeParameter('pageId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/wiki-pages/${pageId}/versions`,
						);
					} else if (operation === 'delete') {
						const pageId = this.getNodeParameter('pageId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/wiki-pages/${pageId}`,
						);
						responseData = emptyToSuccess(responseData, pageId);
					}
				} else if (resource === 'worklog') {
					if (operation === 'getAll') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/items/${itemId}/worklogs`,
						);
					} else if (operation === 'create') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const minutes = this.getNodeParameter('minutes', i) as string;
						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'POST',
							`/api/v1/items/${itemId}/worklogs`,
							{ minutes, ...withDateOnly(additional, 'spentOn') },
						);
					} else if (operation === 'update') {
						const worklogId = this.getNodeParameter('worklogId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/worklogs/${worklogId}`,
							withDateOnly(body, 'spentOn'),
						);
					} else if (operation === 'report') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						const qs = this.getNodeParameter('reportFields', i, {}) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/projects/${projectId}/worklog-report`,
							{},
							withDateOnly(withDateOnly(qs, 'from'), 'to'),
						);
					} else if (operation === 'delete') {
						const worklogId = this.getNodeParameter('worklogId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/worklogs/${worklogId}`,
						);
						responseData = emptyToSuccess(responseData, worklogId);
					}
				} else if (resource === 'initiative') {
					if (operation === 'getAll') {
						responseData = await projectFlowApiRequest.call(this, 'GET', '/api/v1/initiatives');
					} else if (operation === 'get') {
						const initiativeId = this.getNodeParameter('initiativeId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/initiatives/${initiativeId}`,
						);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additional = this.getNodeParameter('additionalFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(this, 'POST', '/api/v1/initiatives', {
							name,
							...withColorName(additional),
						});
					} else if (operation === 'update') {
						const initiativeId = this.getNodeParameter('initiativeId', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/initiatives/${initiativeId}`,
							withColorName(body),
						);
					} else if (operation === 'addProjects' || operation === 'removeProjects') {
						// The endpoint takes only the complete list, and keeps projects the
						// caller cannot see. Sending just the ones named here would drop
						// every other member, so the current list is read first.
						const initiativeId = this.getNodeParameter('initiativeId', i) as string;
						const given = this.getNodeParameter('projectIds', i) as string[];
						const current = (await projectFlowApiRequest.call(
							this,
							'GET',
							`/api/v1/initiatives/${initiativeId}`,
						)) as IDataObject;
						const existing = ((current.projects as IDataObject[]) ?? []).map(
							(pr) => pr.id as string,
						);
						const projectIds =
							operation === 'addProjects'
								? Array.from(new Set([...existing, ...given]))
								: existing.filter((id) => !given.includes(id));
						responseData = await projectFlowApiRequest.call(
							this,
							'PATCH',
							`/api/v1/initiatives/${initiativeId}`,
							{ projectIds },
						);
					} else if (operation === 'delete') {
						const initiativeId = this.getNodeParameter('initiativeId', i) as string;
						responseData = await projectFlowApiRequest.call(
							this,
							'DELETE',
							`/api/v1/initiatives/${initiativeId}`,
						);
						responseData = emptyToSuccess(responseData, initiativeId);
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

/**
 * Renames `colorName` back to the API's `color`.
 *
 * The UI field carries a different name so n8n's lint rule does not insist on a
 * colour picker: the API wants a palette name like 'blue', and a hex value from
 * a picker would not resolve to anything.
 */
function withColorName(fields: IDataObject): IDataObject {
	if (fields.colorName === undefined) return fields;
	const { colorName, ...rest } = fields;
	return colorName === '' ? rest : { ...rest, color: colorName };
}

/** A 204 carries no body; give the workflow something to branch on. */
function emptyToSuccess(
	responseData: IDataObject | IDataObject[],
	id: string,
): IDataObject | IDataObject[] {
	if (!responseData || Object.keys(responseData).length === 0) {
		return { success: true, id };
	}
	return responseData;
}

/**
 * Trims an n8n dateTime down to the calendar day.
 *
 * `spentOn` and the report bounds are days, not moments. n8n hands over a full
 * ISO timestamp, and a timestamp for "today" in a timezone ahead of UTC is
 * rejected as being in the future.
 */
function withDateOnly(fields: IDataObject, key: string): IDataObject {
	const raw = fields[key];
	if (typeof raw !== 'string' || raw === '') return fields;
	return { ...fields, [key]: raw.slice(0, 10) };
}

/** The server's own cap on `/items/search`. Asking for more is refused. */
const SEARCH_MAX_LIMIT = 100;

/** Collection fields that arrive as JSON text and must be sent as objects. */
const JSON_FIELDS = ['dodChecklist', 'customFieldValues'] as const;

/**
 * Turns the JSON-typed collection fields into real objects.
 *
 * n8n hands a `json` field over as a string. Passing it straight through sent
 * the API a quoted string where it wanted an object, and the field was refused.
 */
function parseJsonFields(
	this: IExecuteFunctions,
	fields: IDataObject,
	itemIndex: number,
): IDataObject {
	const out: IDataObject = { ...fields };
	for (const key of JSON_FIELDS) {
		const raw = out[key];
		if (raw === undefined || raw === '') {
			delete out[key];
			continue;
		}
		if (typeof raw !== 'string') continue;
		try {
			out[key] = JSON.parse(raw);
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				`${key} must be valid JSON`,
				{ itemIndex },
			);
		}
	}
	return out;
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
