import { INodeProperties } from 'n8n-workflow';

/**
 * Properties for the resources added in 0.2.0 — channels, discussions, thread
 * replies, wiki pages, work logs and initiatives.
 *
 * Kept out of the node file so that one stays readable: n8n properties are
 * literal arrays, and six resources' worth of them would bury the execute
 * logic they belong to.
 */

// --------------------------------------------------------------- Channels

export const channelOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['channel'] } },
	options: [
		{ name: 'Create', value: 'create', action: 'Create a channel' },
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a channel',
			description:
				'Only works on an empty channel, and only for the project owner. Archive it instead to keep its history.',
		},
		{ name: 'Get Many', value: 'getAll', action: 'Get many channels' },
		{ name: 'Get Overview', value: 'overview', action: 'Get a channel overview' },
		{ name: 'Mark Read', value: 'markRead', action: 'Mark a channel read' },
		{ name: 'Update', value: 'update', action: 'Update a channel' },
	],
	default: 'getAll',
};

export const channelFields: INodeProperties[] = [
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getProjects' },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['channel'], operation: ['getAll', 'create'] } },
	},
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['channel'], operation: ['overview', 'update', 'delete', 'markRead'] },
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Channel name, e.g. development',
		displayOptions: { show: { resource: ['channel'], operation: ['create'] } },
	},
	{
		displayName: 'Include Archived',
		name: 'includeArchived',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['channel'], operation: ['getAll'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['channel'], operation: ['create'] } },
		options: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: 'What the channel is for',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['channel'], operation: ['update'] } },
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Order', name: 'order', type: 'number', default: 0 },
			{ displayName: 'Topic', name: 'topic', type: 'string', default: '' },
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
				description:
					'Whether to archive the channel. Its history is kept. The last active channel of a project cannot be archived.',
			},
		],
	},
];

// ------------------------------------------------------------ Discussions

export const discussionOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['discussion'] } },
	options: [
		{
			name: 'Convert to Item',
			value: 'convertItem',
			action: 'Convert a message to an item',
			description: 'Turns the message into a work item. A message can only be converted once.',
		},
		{ name: 'Create', value: 'create', action: 'Post a message' },
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a message',
			description: 'Deletes the message, its whole thread and every attachment on it',
		},
		{ name: 'Get', value: 'get', action: 'Get a message with its thread' },
		{ name: 'Get Many', value: 'getAll', action: 'Get many messages' },
		{ name: 'Update', value: 'update', action: 'Update a message' },
	],
	default: 'getAll',
};

export const discussionFields: INodeProperties[] = [
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getProjects' },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['discussion'], operation: ['getAll', 'create'] } },
	},
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		required: true,
		default: '',
		description: 'The channel to post in. A message always lives in a channel.',
		displayOptions: { show: { resource: ['discussion'], operation: ['create'] } },
	},
	{
		displayName: 'Message ID',
		name: 'discussionId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['discussion'],
				operation: ['get', 'update', 'delete', 'convertItem'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description:
			'The message text, in Markdown. Names written as @mention notify those people.',
		displayOptions: { show: { resource: ['discussion'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['discussion'], operation: ['create'] } },
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description:
					'An optional headline. Usually left out — a chat message has none, and the first line of the body stands in.',
			},
			{ displayName: 'Area ID', name: 'areaId', type: 'string', default: '' },
			{
				displayName: 'Linked Item IDs',
				name: 'linkedItemIds',
				type: 'string',
				typeOptions: { multipleValues: true },
				default: [],
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['discussion'], operation: ['update'] } },
		options: [
			{ displayName: 'Body', name: 'body', type: 'string', typeOptions: { rows: 4 }, default: '' },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
			{
				displayName: 'Pinned',
				name: 'pinned',
				type: 'boolean',
				default: false,
				description: 'Whether to pin the message in its channel',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'Answered', value: 'answered' },
					{ name: 'Closed', value: 'closed' },
				],
				default: 'open',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['discussion'], operation: ['getAll'] } },
		options: [
			{ displayName: 'Channel ID', name: 'channelId', type: 'string', default: '' },
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'Answered', value: 'answered' },
					{ name: 'Closed', value: 'closed' },
				],
				default: 'open',
				description:
					'Since a discussion became a chat message most stay open forever, so this rarely narrows anything',
			},
		],
	},
	{
		displayName: 'Item Fields',
		name: 'convertFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'All optional. The title falls back to the message text and the status to the project backlog.',
		displayOptions: { show: { resource: ['discussion'], operation: ['convertItem'] } },
		options: [
			{ displayName: 'Assigned User ID', name: 'assignedToId', type: 'string', default: '' },
			{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 4 }, default: '' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '' },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
			{ displayName: 'Type', name: 'type', type: 'string', default: 'task' },
		],
	},
];

// ------------------------------------------------------- Thread replies

export const replyOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['reply'] } },
	options: [
		{ name: 'Create', value: 'create', action: 'Reply in a thread' },
		{ name: 'Delete', value: 'delete', action: 'Delete a reply' },
		{ name: 'Get Many', value: 'getAll', action: 'Get many replies' },
		{ name: 'Update', value: 'update', action: 'Update a reply' },
	],
	default: 'create',
};

export const replyFields: INodeProperties[] = [
	{
		displayName: 'Message ID',
		name: 'discussionId',
		type: 'string',
		required: true,
		default: '',
		description: 'The message whose thread this is',
		displayOptions: { show: { resource: ['reply'], operation: ['getAll', 'create'] } },
	},
	{
		displayName: 'Reply ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['reply'], operation: ['update', 'delete'] } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['reply'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['reply'], operation: ['create'] } },
		options: [
			{
				displayName: 'Parent Reply ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description:
					'The reply you are answering. Must be a reply in this same thread. Leave empty to answer the message itself.',
			},
			{
				displayName: 'Also in Channel',
				name: 'alsoInChannel',
				type: 'boolean',
				default: false,
				description:
					'Whether to surface this reply in the channel too, so people who never opened the thread see it. Meant for the answer that settles the question, not for every remark.',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['reply'], operation: ['update'] } },
		options: [
			{ displayName: 'Content', name: 'content', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{ displayName: 'Also in Channel', name: 'alsoInChannel', type: 'boolean', default: false },
		],
	},
];

// ------------------------------------------------------------ Wiki pages

export const wikiOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['wikiPage'] } },
	options: [
		{ name: 'Create', value: 'create', action: 'Create a wiki page' },
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a wiki page',
			description: 'Deletes the page and its version history. Child pages move up a level.',
		},
		{ name: 'Get', value: 'get', action: 'Get a wiki page' },
		{ name: 'Get Many', value: 'getAll', action: 'Get many wiki pages' },
		{ name: 'Get Versions', value: 'getVersions', action: 'Get a page version history' },
		{
			name: 'Publish',
			value: 'publish',
			action: 'Publish a wiki page version',
			description:
				'Records a numbered snapshot. This is not a visibility switch — every edit is live already.',
		},
		{ name: 'Search', value: 'search', action: 'Search the wiki' },
		{ name: 'Update', value: 'update', action: 'Update a wiki page' },
	],
	default: 'getAll',
};

export const wikiFields: INodeProperties[] = [
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getProjects' },
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['wikiPage'], operation: ['getAll', 'create', 'search'] },
		},
	},
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['wikiPage'],
				operation: ['get', 'update', 'delete', 'publish', 'getVersions'],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['wikiPage'], operation: ['create'] } },
	},
	{
		displayName: 'Search Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['wikiPage'], operation: ['search'] } },
	},
	{
		displayName: 'Type',
		name: 'wikiType',
		type: 'options',
		options: [
			{ name: 'Page', value: 'page' },
			{ name: 'Decision Record (ADR)', value: 'adr' },
		],
		default: 'page',
		displayOptions: { show: { resource: ['wikiPage'], operation: ['getAll', 'create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'The whole request is capped at about 100 KB, so a very long page has to be created and then extended',
		displayOptions: { show: { resource: ['wikiPage'], operation: ['create'] } },
		options: [
			{ displayName: 'Content', name: 'content', type: 'string', typeOptions: { rows: 8 }, default: '' },
			{ displayName: 'Icon', name: 'icon', type: 'string', default: '' },
			{ displayName: 'Parent Page ID', name: 'parentId', type: 'string', default: '' },
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: { multipleValues: true },
				default: [],
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				description: 'A project wiki template to start from. Ignored when content is given.',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'There are no drafts — every saved edit is immediately what readers see',
		displayOptions: { show: { resource: ['wikiPage'], operation: ['update'] } },
		options: [
			{ displayName: 'Content', name: 'content', type: 'string', typeOptions: { rows: 8 }, default: '' },
			{ displayName: 'Icon', name: 'icon', type: 'string', default: '' },
			{
				displayName: 'Locked',
				name: 'locked',
				type: 'boolean',
				default: false,
				description:
					'Whether to lock the page so only its creator and project owners can write to it',
			},
			{
				displayName: 'Owner User ID',
				name: 'ownerId',
				type: 'string',
				default: '',
				description: 'Who is answerable for the page. Defaults to its creator.',
			},
			{
				displayName: 'Review Due At',
				name: 'reviewDueAt',
				type: 'dateTime',
				default: '',
				description: 'When the page should next be looked over',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: { multipleValues: true },
				default: [],
			},
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				options: [
					{ name: 'Project (Internal)', value: 'project' },
					{ name: 'Public (Anyone With the Link)', value: 'public' },
				],
				default: 'project',
				description:
					'Public publishes the page to the open internet for anyone holding the link, not just to more project members',
			},
		],
	},
	{
		displayName: 'Publish Options',
		name: 'publishFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['wikiPage'], operation: ['publish'] } },
		options: [
			{
				displayName: 'Change Note',
				name: 'changeNote',
				type: 'string',
				default: '',
				description: 'Why this version exists. Recorded on the snapshot and shown in the history.',
			},
			{
				displayName: 'Schedule Review (Months)',
				name: 'scheduleReviewMonths',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 60 },
				default: 6,
				description:
					'Set the next review date this many months out. Leaving it out keeps the existing date rather than clearing it.',
			},
		],
	},
];

// -------------------------------------------------------------- Work logs

export const worklogOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['worklog'] } },
	options: [
		{ name: 'Create', value: 'create', action: 'Log time on an item' },
		{ name: 'Delete', value: 'delete', action: 'Delete a work log entry' },
		{ name: 'Get Many', value: 'getAll', action: 'Get an item time entries' },
		{ name: 'Get Report', value: 'report', action: 'Get a project time report' },
		{ name: 'Update', value: 'update', action: 'Update a work log entry' },
	],
	default: 'getAll',
};

export const worklogFields: INodeProperties[] = [
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['worklog'], operation: ['getAll', 'create'] } },
	},
	{
		displayName: 'Work Log ID',
		name: 'worklogId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['worklog'], operation: ['update', 'delete'] } },
	},
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getProjects' },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['worklog'], operation: ['report'] } },
	},
	{
		displayName: 'Duration',
		name: 'minutes',
		type: 'string',
		required: true,
		default: '',
		description:
			'How long, as minutes (90) or as written (90m, 1h30, 1,5h). At most 24 hours per entry.',
		displayOptions: { show: { resource: ['worklog'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['worklog'], operation: ['create'] } },
		options: [
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'What was done',
			},
			{
				displayName: 'Spent On',
				name: 'spentOn',
				type: 'dateTime',
				default: '',
				description: 'The day the work happened. Defaults to today, and cannot be in the future.',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['worklog'], operation: ['update'] } },
		options: [
			{
				displayName: 'Duration',
				name: 'minutes',
				type: 'string',
				default: '',
				description: 'As minutes (90) or as written (90m, 1h30, 1,5h)',
			},
			{ displayName: 'Note', name: 'note', type: 'string', default: '' },
			{ displayName: 'Spent On', name: 'spentOn', type: 'dateTime', default: '' },
		],
	},
	{
		displayName: 'Report Options',
		name: 'reportFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Defaults to the last 30 days grouped by person',
		displayOptions: { show: { resource: ['worklog'], operation: ['report'] } },
		options: [
			{ displayName: 'From', name: 'from', type: 'dateTime', default: '' },
			{
				displayName: 'Group By',
				name: 'groupBy',
				type: 'options',
				options: [
					{ name: 'User', value: 'user' },
					{ name: 'Type', value: 'type' },
					{ name: 'Area', value: 'area' },
					{ name: 'Iteration', value: 'iteration' },
				],
				default: 'user',
				description:
					'Grouping by area counts an entry under every area its item carries, so those group totals can exceed the overall total',
			},
			{
				displayName: 'Then By',
				name: 'thenBy',
				type: 'options',
				options: [
					{ name: 'User', value: 'user' },
					{ name: 'Type', value: 'type' },
					{ name: 'Area', value: 'area' },
					{ name: 'Iteration', value: 'iteration' },
				],
				default: 'area',
				description: 'A second grouping level within each group',
			},
			{ displayName: 'To', name: 'to', type: 'dateTime', default: '' },
		],
	},
];

// ------------------------------------------------------------ Initiatives

export const initiativeOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['initiative'] } },
	options: [
		{
			name: 'Add Projects',
			value: 'addProjects',
			action: 'Add projects to an initiative',
			description: 'Keeps the projects already there',
		},
		{ name: 'Create', value: 'create', action: 'Create an initiative' },
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete an initiative',
			description: 'The projects are not deleted — only the bracket over them',
		},
		{ name: 'Get', value: 'get', action: 'Get an initiative' },
		{ name: 'Get Many', value: 'getAll', action: 'Get many initiatives' },
		{
			name: 'Remove Projects',
			value: 'removeProjects',
			action: 'Remove projects from an initiative',
		},
		{ name: 'Update', value: 'update', action: 'Update an initiative' },
	],
	default: 'getAll',
};

export const initiativeFields: INodeProperties[] = [
	{
		displayName: 'Initiative ID',
		name: 'initiativeId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['initiative'],
				operation: ['get', 'update', 'delete', 'addProjects', 'removeProjects'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['initiative'], operation: ['create'] } },
	},
	{
		displayName: 'Project Names or IDs',
		name: 'projectIds',
		type: 'multiOptions',
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getProjects' },
		required: true,
		default: [],
		displayOptions: {
			show: { resource: ['initiative'], operation: ['addProjects', 'removeProjects'] },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'An initiative brackets projects, not items. Dates are full timestamps.',
		displayOptions: { show: { resource: ['initiative'], operation: ['create'] } },
		options: [
			{
				displayName: 'Colour Name',
				name: 'colorName',
				type: 'color',
				default: 'blue',
				description:
					'A colour name such as blue or amber, not a hex value — the app maps names to its own palette',
			},
			{ displayName: 'End Date', name: 'endDate', type: 'dateTime', default: '' },
			{
				displayName: 'Goal',
				name: 'goal',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Project Names or IDs',
				name: 'projectIds',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getProjects' },
				default: [],
			},
			{ displayName: 'Start Date', name: 'startDate', type: 'dateTime', default: '' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['initiative'], operation: ['update'] } },
		options: [
			{
				displayName: 'Colour Name',
				name: 'colorName',
				type: 'color',
				default: 'blue',
				description:
					'A colour name such as blue or amber, not a hex value — the app maps names to its own palette',
			},
			{ displayName: 'End Date', name: 'endDate', type: 'dateTime', default: '' },
			{ displayName: 'Goal', name: 'goal', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Project Names or IDs',
				name: 'projectIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getProjects' },
				default: [],
				description: 'Replaces the whole project list rather than adding to it. Use Add Projects or Remove Projects to change it piecewise. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{ displayName: 'Start Date', name: 'startDate', type: 'dateTime', default: '' },
		],
	},
];
