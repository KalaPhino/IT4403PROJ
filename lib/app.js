
// TMDB constants already on window by auth.js
const IMAGE_PATH = 'https://image.tmdb.org/t/p/w200';

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let watchList = JSON.parse(localStorage.getItem('watchList')) || [];

// on load, hydrate UI & remote TMDB favorites if already logged in
$(function() {
  updateFavoritesUI();
  updateWatchlistUI();

  // if we already have a session & account ID, load TMDB favorites
  const sid = localStorage.getItem('tmdb_session_id');
  const aid = localStorage.getItem('tmdb_account_id');
  if (sid && aid) {
    fetchTMDBFavorites(aid, sid);
  }

  // UI bindings
  $('#searchBtn').click(() => {
    const q = $('#searchInput').val().trim();
    if (q) searchMovies(q);
  });

  $('#discoverBtn').click(() => discoverPopular());

  $('#tmdbLoginBtn').click(() => {
    getRequestToken()
      .then(res => redirectToTMDB(res.request_token))
      .catch(() => console.error('TMDB authentication failed to start'));
  });

  // detail, favorite, watchlist handlers
  $(document).on('click', '.detailsBtn',   showDetails);
  $(document).on('click', '.favBtn',       toggleLocalFavorite);
  $(document).on('click', '.watchBtn',     toggleLocalWatchlist);
});

function searchMovies(query) {
  $.get(`${BASE_URL}/search/movie`, { api_key: API_KEY, query })
   .done(renderResults)
   .fail(() => $('#mainView').html('<p>Search failed.</p>'));
}

function discoverPopular() {
  $.get(`${BASE_URL}/movie/popular`, { api_key: API_KEY })
   .done(renderResults)
   .fail(() => $('#mainView').html('<p>Discovery failed.</p>'));
}

function renderResults(data) {
  const $view = $('#mainView').empty();
  data.results.forEach(movie => {
    const poster = movie.poster_path ? IMAGE_PATH + movie.poster_path : '';
    $view.append(`
      <div class="movie">
        <img src="${poster}" alt="${movie.title}" />
        <span>${movie.title}</span>
        <button class="detailsBtn" data-id="${movie.id}">Details</button>
        <button class="favBtn" data-id="${movie.id}" data-title="${movie.title}">
          Favorite
        </button>
        <button class="watchBtn" data-id="${movie.id}" data-title="${movie.title}">
          Watchlist
        </button>
      </div>
    `);
  });
}

function showDetails() {
  const id = $(this).data('id');
  $.get(`${BASE_URL}/movie/${id}`, {
    api_key: API_KEY,
    append_to_response: 'credits,reviews'
  })
  .done(data => {
    const cast   = (data.credits.cast || []).slice(0,5)
                   .map(a=>`<li>${a.name} as ${a.character}</li>`).join('');
    const reviews= (data.reviews.results||[]).slice(0,3)
                   .map(r=>`<li><strong>${r.author}:</strong> ${r.content}</li>`).join('');
    $('#detailsView').html(`
      <h2>${data.title}</h2>
      <p>${data.overview||'No description.'}</p>
      <h3>Cast</h3><ul>${cast||'<li>No cast info.</li>'}</ul>
      <h3>Reviews</h3><ul>${reviews||'<li>No reviews.</li>'}</ul>
    `);
  })
  .fail(() => $('#detailsView').html('<p>Details not available.</p>'));
}

function toggleLocalFavorite() {
  const id    = $(this).data('id');
  const title = $(this).data('title');
  if (!favorites.find(f=>f.id===id)) {
    favorites.push({id,title});
  } else {
    favorites = favorites.filter(f=>f.id!==id);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavoritesUI();
}

function toggleLocalWatchlist() {
  const id    = $(this).data('id');
  const title = $(this).data('title');
  if (!watchList.find(w=>w.id===id)) {
    watchList.push({id,title});
  } else {
    watchList = watchList.filter(w=>w.id!==id);
  }
  localStorage.setItem('watchList', JSON.stringify(watchList));
  updateWatchlistUI();
}

function updateFavoritesUI() {
  const html = favorites.length
    ? favorites.map(f=>`<li>${f.title}</li>`).join('')
    : '<li>No local favorites.</li>';
  $('#favoritesList').html(html);
}

function updateWatchlistUI() {
  const html = watchList.length
    ? watchList.map(w=>`<li>${w.title}</li>`).join('')
    : '<li>No local watchlist.</li>';
  $('#watchList').html(html);
}
