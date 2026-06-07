import {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IRequestOptions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

/**
 * Resolve the configured base URL from whichever credential the node uses.
 */
async function getBaseUrl(this: Ctx): Promise<string> {
	const authentication = this.getNodeParameter('authentication', 0, 'tokenApi') as string;
	const credName = authentication === 'oAuth2' ? 'projectFlowOAuth2Api' : 'projectFlowTokenApi';
	const credentials = await this.getCredentials(credName);
	const baseUrl = (credentials.baseUrl as string) || '';
	return baseUrl.replace(/\/$/, '');
}

/**
 * Make an authenticated request to the ProjectFlow API, using the credential
 * type selected on the node (Personal Token or OAuth2).
 */
export async function projectFlowApiRequest(
	this: Ctx,
	method: IRequestOptions['method'],
	endpoint: string,
	body: IDataObject | Buffer = {},
	qs: IDataObject = {},
	options: Partial<IRequestOptions> = {},
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0, 'tokenApi') as string;
	const baseUrl = await getBaseUrl.call(this);

	const requestOptions: IRequestOptions = {
		method,
		body,
		qs,
		uri: `${baseUrl}${endpoint}`,
		json: true,
		...options,
	};

	if (Object.keys(body).length === 0 && !(body instanceof Buffer)) {
		delete requestOptions.body;
	}
	if (Object.keys(qs).length === 0) {
		delete requestOptions.qs;
	}

	const credentialType =
		authentication === 'oAuth2' ? 'projectFlowOAuth2Api' : 'projectFlowTokenApi';

	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * loadOptions: list the projects the authenticated user can access.
 */
export async function getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const projects = (await projectFlowApiRequest.call(this, 'GET', '/api/v1/projects')) as Array<{
		id: string;
		name: string;
	}>;
	return projects.map((p) => ({ name: p.name, value: p.id }));
}

/**
 * loadOptions: list the statuses defined on the currently selected project.
 */
export async function getStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const projectId = this.getNodeParameter('projectId', '') as string;
	if (!projectId) return [];
	const project = (await projectFlowApiRequest.call(
		this,
		'GET',
		`/api/v1/projects/${projectId}`,
	)) as { statuses?: Array<{ key?: string; id?: string; name: string }> };
	return (project.statuses ?? []).map((s) => ({
		name: s.name,
		value: (s.key ?? s.id ?? s.name) as string,
	}));
}

/**
 * loadOptions: list the custom item types defined on the selected project,
 * plus the three built-in types.
 */
export async function getItemTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const builtIn: INodePropertyOptions[] = [
		{ name: 'Idea', value: 'idea' },
		{ name: 'Feature', value: 'feature' },
		{ name: 'Bug', value: 'bug' },
	];
	const projectId = this.getNodeParameter('projectId', '') as string;
	if (!projectId) return builtIn;
	const project = (await projectFlowApiRequest.call(
		this,
		'GET',
		`/api/v1/projects/${projectId}`,
	)) as { customItemTypes?: Array<{ id: string; name: string }> };
	const custom = (project.customItemTypes ?? []).map((t) => ({ name: t.name, value: t.id }));
	return [...builtIn, ...custom];
}

/**
 * loadOptions: list the areas defined on the selected project.
 */
export async function getAreas(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const projectId = this.getNodeParameter('projectId', '') as string;
	if (!projectId) return [];
	const project = (await projectFlowApiRequest.call(
		this,
		'GET',
		`/api/v1/projects/${projectId}`,
	)) as { areas?: Array<{ id: string; name: string }> };
	return (project.areas ?? []).map((a) => ({ name: a.name, value: a.id }));
}
