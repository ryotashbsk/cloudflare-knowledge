type BasicAuthEnv = {
  BASIC_AUTH_ENABLED?: string;
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASSWORD?: string;
};

type MiddlewareContext = {
  request: Request;
  env: BasicAuthEnv;
  next: () => Response | Promise<Response>;
};

type MiddlewareHandler = (context: MiddlewareContext) => Response | Promise<Response>;

// 予期しないエラーの詳細は Cloudflare のログに残し訪問者には表示しない
const errorHandling: MiddlewareHandler = async (context) => {
  try {
    return await context.next();
  } catch (err) {
    console.error(err);

    return new Response('Internal Server Error', { status: 500 });
  }
};

// ブラウザに BASIC 認証の入力ダイアログを表示させる
const authenticateHeader: HeadersInit = {
  'WWW-Authenticate': 'Basic realm="Cloudflare Pages", charset="UTF-8"'
};

function unauthorized(message = 'You need to login.'): Response {
  return new Response(message, {
    status: 401,
    headers: authenticateHeader
  });
}

// Authorization ヘッダーを「ユーザー名:パスワード」の文字列にデコードする
function decodeBasicCredentials(authorization: string): string | null {
  const match = authorization.match(/^Basic\s+(.+)$/i);

  if (!match) {
    return null;
  }

  try {
    const buffer = Uint8Array.from(atob(match[1]), (character) => character.charCodeAt(0));
    return new TextDecoder().decode(buffer);
  } catch {
    return null;
  }
}

const handleRequest: MiddlewareHandler = async (context) => {
  // BASIC 認証が明示的に有効化されていない場合はそのまま公開する
  if (context.env.BASIC_AUTH_ENABLED !== '1') {
    return await context.next();
  }

  // BASIC 認証が有効なのに認証情報がない場合はデプロイ設定の不備として扱う
  if (!context.env.BASIC_AUTH_USER || !context.env.BASIC_AUTH_PASSWORD) {
    return new Response('Basic authentication is not configured.', { status: 500 });
  }

  const authorization = context.request.headers.get('Authorization');

  if (authorization) {
    const decoded = decodeBasicCredentials(authorization);

    if (!decoded) {
      return new Response('Invalid authorization value.', { status: 400 });
    }

    // BASIC 認証の認証情報は「ユーザー名:パスワード」の形式でエンコードされる
    const index = decoded.indexOf(':');

    if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
      return unauthorized('Invalid credentials.');
    }

    const user = decoded.substring(0, index);
    const pass = decoded.substring(index + 1);

    if (context.env.BASIC_AUTH_USER !== user) {
      return unauthorized('Invalid credentials.');
    }

    if (context.env.BASIC_AUTH_PASSWORD !== pass) {
      return unauthorized('Invalid credentials.');
    }

    return await context.next();
  }

  return unauthorized();
};

export const onRequest = [errorHandling, handleRequest] satisfies MiddlewareHandler[];
