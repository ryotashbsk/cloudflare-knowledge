async function errorHandling(context) {
  try {
    return await context.next();
  } catch (err) {
    console.error(err);

    return new Response('Internal Server Error', { status: 500 });
  }
}

const authenticateHeader = {
  'WWW-Authenticate': 'Basic realm="Cloudflare Pages", charset="UTF-8"'
};

function unauthorized(message = 'You need to login.') {
  return new Response(message, {
    status: 401,
    headers: authenticateHeader
  });
}

function decodeBasicCredentials(authorization) {
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

async function handleRequest(context) {
  if (context.env.BASIC_AUTH_ENABLED !== '1') {
    return await context.next();
  }

  if (!context.env.BASIC_AUTH_USER || !context.env.BASIC_AUTH_PASSWORD) {
    return new Response('Basic authentication is not configured.', { status: 500 });
  }

  const authorization = context.request.headers.get('Authorization');

  if (authorization) {
    const decoded = decodeBasicCredentials(authorization);

    if (!decoded) {
      return new Response('Invalid authorization value.', { status: 400 });
    }

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
}

export const onRequest = [errorHandling, handleRequest];
