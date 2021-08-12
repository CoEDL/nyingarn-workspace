import { tokenSessionKey, getLocalStorage } from "@/components/storage";

export default class HTTPService {
    constructor() {}

    getHeaders() {
        try {
            let { token } = getLocalStorage({ key: tokenSessionKey });
            return {
                authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };
        } catch (error) {
            return {
                "Content-Type": "application/json",
            };
        }
    }

    async get({ route }) {
        let headers = this.getHeaders();
        let response = await fetch(`/api${route}`, {
            method: "GET",
            headers,
        });
        return response;
    }

    async post({ route, body }) {
        let headers = this.getHeaders();
        let response = await fetch(`/api${route}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        return response;
    }

    async put({ route, body }) {
        let response = await fetch(`/api${route}`, {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify(body),
        });
        return response;
    }

    async delete({ route }) {
        let response = await fetch(`/api${route}`, {
            method: "delete",
            headers: this.getHeaders(),
        });
        return response;
    }
}
