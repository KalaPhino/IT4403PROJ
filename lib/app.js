/*
  lib/app.js

  Main SPA logic for:
   - Searching and discovering movies
   - Rendering results in grid/list views
   - Sorting, filtering, and paginating results
   - Displaying movie details and person profiles
   - Managing local favorites and watchlist
   - Syncing remote TMDB favorites via auth.js
*/

const IMAGE_PATH = 'https://image.tmdb.org/t/p/w200';

let state = {
  mode: 'search',        // 'search' or 'discover'
  query: '',             // search term
  page: 1,               // current page
  totalPages: 1,         // total pages returned
  results: [],           // last fetched results
  filtered: null         // filtered results (by year)
};

// Local lists
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let watchList = JSON.parse(localStorage.getItem('watchList')) || [];

$(init);

function init() {
    // Render local favorites and watchlist on load
  bindUI();
  renderLocalLists();

  // If already authenticated, fetch TMDB favorites
  const sid = localStorage.getItem('tmdb_session_id');
  const aid = localStorage.getItem('tmdb_account_id');
  if (sid && aid) fetchTMDBFavorites(aid, sid);
}

function bindUI() {
    // Search and Discover buttons
  $('#searchBtn').click(() => doSearch(1));
  $('#discoverBtn').click(() => doDiscover(1));
  // Toggle between grid and list views
  $('#gridViewBtn').click(() => setView('grid'));
  $('#listViewBtn').click(() => setView('list'));
  // Sorting dropdown and year filter input
  $('#sortSelect').change(applySortFilter);
  $('#filterYear').on('input', applySortFilter);
  // Pagination controls
  $('#prevPageBtn').click(() => goPage(state.page - 1));
  $('#nextPageBtn').click(() => goPage(state.page + 1));
  // TMDB authentication button
  $('#tmdbLoginBtn').click(() =>
    getRequestToken()
      .then(res => redirectToTMDB(res.request_token))
      .catch(() => console.error('TMDB auth failed.'))
  );
  // Delegate clicks for dynamic content buttons
  $(document).on('click', '.detailsBtn', showDetails);
  $(document).on('click', '.favBtn', toggleFavorite);
  $(document).on('click', '.watchBtn', toggleWatchlist);
  $(document).on('click', '.personBtn', showPersonDetails);
}

/**
 * Perform a movie search with the entered query
 */

function doSearch(page) {
  const q = $('#searchInput').val().trim();
  if (!q) return;
  state.mode = 'search'; state.query = q; state.page = page; state.filtered = null;
  $.get(`${BASE_URL}/search/movie`, {
    api_key: API_KEY, query: q, page
  }).done(resp => {
    state.results = resp.results;
    state.page = resp.page;
    state.totalPages = resp.total_pages;
    renderResults();
    updatePagination();
  });
}

/**
 * Perform popular movie search */

function doDiscover(page) {
  state.mode = 'discover'; state.query = ''; state.page = page; state.filtered = null;
  $.get(`${BASE_URL}/movie/popular`, {
    api_key: API_KEY, page
  }).done(resp => {
    state.results = resp.results;
    state.page = resp.page;
    state.totalPages = resp.total_pages;
    renderResults();
    updatePagination();
  });
}

/**
 * Render the current set of results (or filtered subset) into #mainView
 */

function renderResults() {
  const data = state.filtered || state.results;
  const $view = $('#mainView').empty();
  data.forEach(movie => {
    const poster = movie.poster_path ? IMAGE_PATH + movie.poster_path : '';
    const $card = $(`
      <div class="movie">
        <img src="${poster}" alt="${movie.title}" />
        <span>${movie.title}</span>
        <button class="detailsBtn" data-id="${movie.id}">Details</button>
        <button class="favBtn" data-id="${movie.id}" data-title="${movie.title}">
          ${favorites.some(f=>f.id===movie.id)? 'Unfavorite':'Favorite'}
        </button>
        <button class="watchBtn" data-id="${movie.id}" data-title="${movie.title}">
          ${watchList.some(w=>w.id===movie.id)? 'Remove':'Watchlist'}
        </button>
      </div>
    `);
    $view.append($card);
  });
}

/**
 * Update pagination UI based on current state
 */

function updatePagination() {
  $('#currentPage').text(state.page);
  $('#totalPages').text(state.totalPages);
  $('#prevPageBtn').prop('disabled', state.page <= 1);
  $('#nextPageBtn').prop('disabled', state.page >= state.totalPages);
}

function goPage(newPage) {
  if (newPage < 1 || newPage > state.totalPages) return;
  state.mode === 'search' ? doSearch(newPage) : doDiscover(newPage);
}

function setView(view) {
  state.view = view; 
  $('#mainView').toggleClass('grid-view', view==='grid');
  $('#mainView').toggleClass('list-view', view==='list');
  $('#gridViewBtn').toggleClass('active', view==='grid');
  $('#listViewBtn').toggleClass('active', view==='list');
}

/**
 * Sort and/or filter the current result set by year or selected criteria
 */

function applySortFilter() {
  let list = [...state.results];
  // Filter by year
  const year = $('#filterYear').val();
  if (year) {
    list = list.filter(m => m.release_date && m.release_date.startsWith(year));
  }
  // Sort
  const sortBy = $('#sortSelect').val();
  if (sortBy) {
    list.sort((a,b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else {
        return (b[sortBy] || 0) - (a[sortBy] || 0);
      }
    });
  }
  state.filtered = list;
  renderResults();
}
/**
 * Fetch and display details for a single movie, including cast & reviews
 */
function showDetails() {
  const id = $(this).data('id');
  $.get(`${BASE_URL}/movie/${id}`, {
    api_key: API_KEY,
    append_to_response: 'credits,reviews'
  }).done(data => {
    const castItems = (data.credits.cast||[])
      .slice(0,5)
      .map(c => `<li class="personBtn" data-id="${c.id}">${c.name} (${c.character})</li>`)
      .join('');
    const reviewItems = (data.reviews.results||[])
      .slice(0,3)
      .map(r => `<li><strong>${r.author}:</strong> ${r.content}</li>`)
      .join('');
    $('#detailsView').html(`
      <h2>${data.title}</h2>
      <p>${data.overview||'No description.'}</p>
      <h3>Cast</h3><ul>${castItems||'<li>No cast.</li>'}</ul>
      <h3>Reviews</h3><ul>${reviewItems||'<li>No reviews.</li>'}</ul>
    `);
  });
}

/**
 * Fetch and display information about an actor/actress
 */

function showPersonDetails() {
  const pid = $(this).data('id');
  $.get(`${BASE_URL}/person/${pid}`, {
    api_key: API_KEY,
    append_to_response: 'movie_credits'
  }).done(person => {
    const credits = (person.movie_credits.cast||[])
      .slice(0,5)
      .map(m => `<li>${m.title} (${m.release_date?.slice(0,4)||''})</li>`)
      .join('');
    $('#detailsView').html(`
      <h2>${person.name}</h2>
      <img src="${person.profile_path? IMAGE_PATH+person.profile_path: ''}" />
      <p>${person.biography||'No bio available.'}</p>
      <h3>Known For</h3><ul>${credits||'<li>None.</li>'}</ul>
    `);
  });
}

/**
 * Add or remove a movie from local favorites, then re-render lists
 */


function toggleFavorite() {
  const id    = $(this).data('id');
  const title = $(this).data('title');
  const idx   = favorites.findIndex(f=>f.id===id);
  if (idx === -1) favorites.push({id,title});
  else favorites.splice(idx,1);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderLocalLists();
  renderResults();
}

/**
 * Add or remove a movie from local watchlist, then re-render lists
 */

function toggleWatchlist() {
  const id    = $(this).data('id');
  const title = $(this).data('title');
  const idx   = watchList.findIndex(w=>w.id===id);
  if (idx === -1) watchList.push({id,title});
  else watchList.splice(idx,1);
  localStorage.setItem('watchList', JSON.stringify(watchList));
  renderLocalLists();
  renderResults();
}

/**
 * Render the local favorites and watchlist sections
 */

function renderLocalLists() {
  $('#favoritesList').html(
    favorites.length
      ? favorites.map(f=>`<li>${f.title}</li>`).join('')
      : '<li>No local favorites.</li>'
  );
  $('#watchList').html(
    watchList.length
      ? watchList.map(w=>`<li>${w.title}</li>`).join('')
      : '<li>No local watchlist.</li>'
  );
}
