const API_KEY = 'be8f4e1d73fb69172ff9911101ebb828';
const READ_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiZThmNGUxZDczZmI2OTE3MmZmOTkxMTEwMWViYjgyOCIsIm5iZiI6MTc1MzEzOTYwMS45OSwic3ViIjoiNjg3ZWM5OTEyMjMxMDJiYzNlNTVkMzI5Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.Uc8G3KSxoUX_vP6OtMggr20D9vF7YtK7onv3WJzSx64';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_PATH = 'https://image.tmdb.org/t/p/w200';

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let watchList = JSON.parse(localStorage.getItem('watchList')) || [];

$(document).ready(function () {
  updateFavoritesUI();
  updateWatchlistUI();

  $('#searchBtn').on('click', function () {
    const query = $('#searchInput').val();
    if (query.trim()) {
      searchMovie(query);
    }
  });

  $('#discoverBtn').on('click', function () {
    discoverPopular();
  });

  function searchMovie(query) {
    $.ajax({
      url: `${BASE_URL}/search/movie`,
      data: {
        api_key: API_KEY,
        query: query
      },
      success: renderResults,
      error: function () {
        $('#mainView').html('<p>Search failed. Please try again.</p>');
      }
    });
  }

  function discoverPopular() {
    $.ajax({
      url: `${BASE_URL}/movie/popular`,
      data: { api_key: API_KEY },
      success: renderResults,
      error: function () {
        $('#mainView').html('<p>Could not load popular movies.</p>');
      }
    });
  }

  function renderResults(data) {
    $('#mainView').empty();

    data.results.forEach(movie => {
      const poster = movie.poster_path ? IMAGE_PATH + movie.poster_path : '';
      const card = $(`
        <div class="movie">
          <img src="${poster}" alt="${movie.title}" />
          <span>${movie.title}</span>
          <button class="detailsBtn" data-id="${movie.id}">Details</button>
          <button class="favBtn" data-id="${movie.id}" data-title="${movie.title}">Favorite</button>
          <button class="watchBtn" data-id="${movie.id}" data-title="${movie.title}">Watchlist</button>
        </div>
      `);
      $('#mainView').append(card);
    });
  }

  $(document).on('click', '.detailsBtn', function () {
    const movieId = $(this).data('id');

    $.ajax({
      url: `${BASE_URL}/movie/${movieId}`,
      data: {
        api_key: API_KEY,
        append_to_response: 'credits,reviews'
      },
      success: renderDetails,
      error: function () {
        $('#detailsView').html('<p>Details not available.</p>');
      }
    });
  });

  function renderDetails(data) {
    const cast = data.credits.cast.slice(0, 5).map(actor => {
      return `<li>${actor.name} (${actor.character})</li>`;
    }).join('');

    const reviews = data.reviews.results.slice(0, 3).map(review => {
      return `<li><strong>${review.author}</strong>: ${review.content}</li>`;
    }).join('');

    $('#detailsView').html(`
      <h2>${data.title}</h2>
      <p>${data.overview || 'No description available.'}</p>
      <h3>Cast</h3>
      <ul>${cast || '<li>No cast information available.</li>'}</ul>
      <h3>Reviews</h3>
      <ul>${reviews || '<li>No reviews available.</li>'}</ul>
    `);
  }

  $(document).on('click', '.favBtn', function () {
    const id = $(this).data('id');
    const title = $(this).data('title');

    if (!favorites.some(item => item.id === id)) {
      favorites.push({ id, title });
      localStorage.setItem('favorites', JSON.stringify(favorites));
      updateFavoritesUI();
    }
  });

  $(document).on('click', '.watchBtn', function () {
    const id = $(this).data('id');
    const title = $(this).data('title');

    if (!watchList.some(item => item.id === id)) {
      watchList.push({ id, title });
      localStorage.setItem('watchList', JSON.stringify(watchList));
      updateWatchlistUI();
    }
  });

  function updateFavoritesUI() {
    $('#favoritesList').html(favorites.map(item => `<li>${item.title}</li>`).join(''));
  }

  function updateWatchlistUI() {
    $('#watchList').html(watchList.map(item => `<li>${item.title}</li>`).join(''));
  }
});
