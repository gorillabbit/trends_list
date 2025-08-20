interface ApiError {
	error: string;
}

interface ApiRequestInit extends RequestInit {
	requireAuth?: boolean;
}

export class ApiClient {
	private baseUrl: string;
	private getToken?: () => Promise<string | null>;

	constructor(baseUrl: string = '/api', getToken?: () => Promise<string | null>) {
		this.baseUrl = baseUrl;
		this.getToken = getToken;
	}

	private async request<T>(
		endpoint: string,
		options: ApiRequestInit = {}
	): Promise<T> {
		const { requireAuth = false, ...fetchOptions } = options;
		
		const url = `${this.baseUrl}${endpoint}`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...((fetchOptions.headers as Record<string, string>) || {}),
		};

		if (requireAuth && this.getToken) {
			const token = await this.getToken();
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}
		}

		try {
			const response = await fetch(url, {
				...fetchOptions,
				headers,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error((data as ApiError).error || `HTTP ${response.status}`);
			}

			return data as T;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('An unknown error occurred');
		}
	}

	async get<T>(endpoint: string, requireAuth = false): Promise<T> {
		return this.request<T>(endpoint, { method: 'GET', requireAuth });
	}

	async post<T>(
		endpoint: string,
		data?: unknown,
		requireAuth = false
	): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined,
			requireAuth,
		});
	}

	async put<T>(
		endpoint: string,
		data?: unknown,
		requireAuth = false
	): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined,
			requireAuth,
		});
	}

	async delete<T>(endpoint: string, requireAuth = false): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE', requireAuth });
	}
}

export const createApiClient = (getToken?: () => Promise<string | null>) => {
	return new ApiClient('/api', getToken);
};