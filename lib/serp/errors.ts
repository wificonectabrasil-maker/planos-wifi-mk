import { SerpProviderError } from "@/lib/serp/provider";

type MappedSerpError = {
  status: number;
  error: string;
  message: string;
};

export function mapSerpProviderError(error: SerpProviderError): MappedSerpError {
  const rawMessage = (error.message || "").toLowerCase();
  const rawCode = (error.code || "").toLowerCase();

  if (error.provider === "serper") {
    if (error.status === 401 || rawMessage.includes("invalid api key")) {
      return {
        status: 401,
        error: "invalid_credentials",
        message: "SERPER_API_KEY invalida.",
      };
    }

    if (error.status === 429 || rawMessage.includes("quota") || rawMessage.includes("searches left")) {
      return {
        status: 429,
        error: "quota_exceeded",
        message: "Quota da Serper excedida.",
      };
    }

    if (error.status === 403) {
      return {
        status: 403,
        error: "forbidden",
        message: "Serper bloqueou a requisicao. Revise a chave e as permissoes da conta.",
      };
    }
  }

  if (error.status === 401) {
    return {
      status: 401,
      error: "invalid_credentials",
      message: "API key do Google invalida ou com restricao incorreta.",
    };
  }

  if (error.status === 403) {
    const apiNotEnabled =
      rawMessage.includes("custom search json api") &&
      (rawMessage.includes("does not have the access") || rawCode === "forbidden");

    if (apiNotEnabled) {
      return {
        status: 403,
        error: "api_not_enabled",
        message:
          "Projeto sem acesso a Custom Search JSON API. Ative a API no Google Cloud e revise o acesso do projeto da chave.",
      };
    }

    return {
      status: 403,
      error: "forbidden",
      message: "Google bloqueou a requisicao. Revise API key, restricoes e Search Engine ID (cx).",
    };
  }

  if (error.status === 429) {
    return {
      status: 429,
      error: "quota_exceeded",
      message: "Quota da API de busca excedida.",
    };
  }

  if (error.status === 504) {
    return {
      status: 504,
      error: "timeout",
      message: "Timeout ao consultar o provedor de busca.",
    };
  }

  return {
    status: error.status || 500,
    error: "search_provider_error",
    message: "Erro ao consultar o provedor de busca.",
  };
}
