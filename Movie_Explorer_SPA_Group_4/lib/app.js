const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_PATH = 'https://image.tmdb.org/t/p/w200';

$(document).ready(function () {
  $('#searchBtn').click(() => searchMovie($('#searchInput').val()));
  $('#discoverBtn').click(() => discoverPopular());

  function searchMovie(query) {
    $.ajax({
      url: `${BASE_URL}/search/movie`,
      data: { api_key: API_KEY, query: query },
      success: renderResults
    });
  }

  function discoverPopular() {
    $.ajax({
      url: `${BASE_URL}/movie/popular`,
      data: { api_key: API_KEY },
      success: renderResults
    });
  }

  function renderResults(data) {
    $('#mainView').empty();
    data.results.forEach(movie => {
      const $item = $(`
        <div class="movie">
          <img src="${IMAGE_PATH}${movie.poster_path}" alt="${movie.title}" />
          <span>${movie.title}</span>
          <button class="detailsBtn" data-id="${movie.id}">Details</button>
          <button class="favBtn">Favorites</button>
          <button class="watchBtn">Watch</button>
        </div>
      `);
      $('#mainView').append($item);
    });
  }

  $(document).on('click', '.detailsBtn', function () {
    const movieId = $(this).data('id');
    $.ajax({
      url: `${BASE_URL}/movie/${movieId}`,
      data: { api_key: API_KEY, append_to_response: 'credits,reviews' },
      success: renderDetails
    });
  });

  function renderDetails(data) {
    $('#detailsView').html(`
      <h2>${data.title}</h2>
      <p>${data.overview}</p>
      <h3>Cast</h3>
      <ul>
        ${data.credits.cast.slice(0, 5).map(c => `<li>${c.name} (${c.character})</li>`).join('')}
      </ul>
      <h3>Reviews</h3>
      <ul>
        ${data.reviews.results.slice(0, 3).map(r => `<li><strong>${r.author}</strong>: ${r.content}</li>`).join('')}
      </ul>
    `);
  }

  let favorites = [];
  let watchList = [];

  $(document).on('click', '.favBtn', function () {
    const title = $(this).siblings('span').text();
    favorites.push(title);
    updateFavorites();
  });

  $(document).on('click', '.watchBtn', function () {
    const title = $(this).siblings('span').text();
    watchList.push(title);
    updateWatchList();
  });

  function updateFavorites() {
    $('#favoritesList').html(favorites.map(title => `<li>${title}</li>`).join(''));
  }

  function updateWatchList() {
    $('#watchList').html(watchList.map(title => `<li>${title}</li>`).join(''));
  }
});
