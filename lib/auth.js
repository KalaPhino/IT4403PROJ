// shared constants
const API_KEY  = 'be8f4e1d73fb69172ff9911101ebb828';
const BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Step 1. Request a new token
 */
function getRequestToken() {
  return $.get(`${BASE_URL}/authentication/token/new`, {
    api_key: API_KEY
  });
}

/**
 * Step 2. Redirect user to TMDB to approve
 */
function redirectToTMDB(token) {
  // build a path to approved.html in current directory
  const path = window.location.pathname;
  const base = path.substring(0, path.lastIndexOf('/') + 1);
  const redirectURL = `${window.location.origin}${base}approved.html`;

  window.location.href =
    `https://www.themoviedb.org/authenticate/${token}`
    + `?redirect_to=${encodeURIComponent(redirectURL)}`;
}

/**
 * Step 3. Swap approved token for a session_id
 */
function createSession(requestToken) {
  return $.ajax({
    url: `${BASE_URL}/authentication/session/new?api_key=${API_KEY}`,
    method: 'POST',
    contentType: 'application/json;charset=utf-8',
    data: JSON.stringify({ request_token: requestToken })
  })
  .done(resp => {
    localStorage.setItem('tmdb_session_id', resp.session_id);
    fetchAccountInfo(resp.session_id);
  })
  .fail(() => console.error(
    'Session creation failed. Token not approved or invalid API key.'
  ));
}

/**
 * Step 4. Get account details (to fetch account_id)
 */
function fetchAccountInfo(sessionId) {
  $.get(`${BASE_URL}/account`, {
    api_key: API_KEY,
    session_id: sessionId
  })
  .done(acct => {
    localStorage.setItem('tmdb_account_id', acct.id);
    fetchTMDBFavorites(acct.id, sessionId)
      // once favorites are in localStorage, go back home
      .always(() => window.location.href = 'index.html');
  })
  .fail(() => console.error('Could not retrieve account info.'));
}

/**
 * Step 5. Fetch & render actual TMDB favorites
 */
function fetchTMDBFavorites(accountId, sessionId) {
  return $.get(`${BASE_URL}/account/${accountId}/favorite/movies`, {
    api_key: API_KEY,
    session_id: sessionId
  })
  .done(resp => {
    const list = resp.results || [];
    if (!list.length) {
      $('#tmdbFavoritesList').html('<li>No TMDB favorites found.</li>');
      return;
    }
    const html = list.map(m => `<li>${m.title}</li>`).join('');
    $('#tmdbFavoritesList').html(html);
  })
  .fail(() => {
    $('#tmdbFavoritesList').html('<li>Failed to load TMDB favorites.</li>');
  });
}

// expose for approved.html
window.getRequestToken    = getRequestToken;
window.redirectToTMDB     = redirectToTMDB;
window.createSession      = createSession;
window.fetchAccountInfo   = fetchAccountInfo;
window.fetchTMDBFavorites = fetchTMDBFavorites;
