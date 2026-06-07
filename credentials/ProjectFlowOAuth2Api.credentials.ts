import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ProjectFlowOAuth2Api implements ICredentialType {
	name = 'projectFlowOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'ProjectFlow OAuth2 API';


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
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '={{$self["baseUrl"]}}/api/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '={{$self["baseUrl"]}}/api/oauth/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
