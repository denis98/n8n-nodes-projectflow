import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ProjectFlowTokenApi implements ICredentialType {
	name = 'projectFlowTokenApi';

	displayName = 'ProjectFlow Personal Token API';


	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://kanban.example.com',
			required: true,
			description: 'The base URL of your ProjectFlow instance (no trailing slash)',
		},
		{
			displayName: 'Personal Access Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'A personal access token (starts with "pt_"). Create one in ProjectFlow under Account → Tokens.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/projects',
		},
	};
}
