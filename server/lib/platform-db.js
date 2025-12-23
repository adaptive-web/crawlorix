import { neon } from '@neondatabase/serverless';

let _platformSql = null;

function getPlatformSql() {
  if (!_platformSql) {
    const dbUrl = process.env.PLATFORM_DATABASE_URL;
    if (!dbUrl) {
      throw new Error('PLATFORM_DATABASE_URL environment variable is not set');
    }
    _platformSql = neon(dbUrl);
  }
  return _platformSql;
}

export async function checkUserAppAccess(email, appId) {
  try {
    const sql = getPlatformSql();
    const result = await sql`
      SELECT uaa.has_access 
      FROM user_app_access uaa
      JOIN users u ON u.id = uaa.user_id
      JOIN apps a ON a.id = uaa.app_id
      WHERE u.email = ${email} AND a.id = ${appId}
    `;
    return result[0]?.has_access ?? false;
  } catch (error) {
    console.error('Error checking user app access:', error);
    return false;
  }
}

export async function isUserAdmin(email) {
  try {
    const sql = getPlatformSql();
    const result = await sql`SELECT is_admin FROM users WHERE email = ${email}`;
    return result[0]?.is_admin ?? false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
