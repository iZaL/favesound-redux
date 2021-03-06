import flow from 'lodash/fp/flow';
import map from 'lodash/fp/map';
import filter from 'lodash/fp/filter';
import { arrayOf, normalize } from 'normalizr';
import userSchema from '../../schemas/user';
import trackSchema from '../../schemas/track';
import * as actionTypes from '../../constants/actionTypes';
import * as requestTypes from '../../constants/requestTypes';
import * as paginateLinkTypes from '../../constants/paginateLinkTypes';
import { setRequestInProcess } from '../../actions/request';
import { setPaginateLink } from '../../actions/paginate';
import { mergeEntities } from '../../actions/entities';
import { isTrack } from '../../services/track';
import { apiUrl, addAccessTokenWith, getLazyLoadingUrl } from '../../services/api';

export function mergeFollowings(followings) {
  return {
    type: actionTypes.MERGE_FOLLOWINGS,
    followings
  };
}

export const fetchFollowings = (user, nextHref, ignoreInProgress) => (dispatch, getState) => {
  let requestType = requestTypes.FOLLOWINGS;
  let url = getLazyLoadingUrl(user, nextHref, 'followings?limit=20&offset=0');
  let requestInProcess = getState().request[requestType];

  if (requestInProcess && !ignoreInProgress) { return; }

  dispatch(setRequestInProcess(true, requestType));

  return fetch(url)
    .then(response => response.json())
    .then(data => {
      const normalized = normalize(data.collection, arrayOf(userSchema));
      dispatch(mergeEntities(normalized.entities));
      dispatch(mergeFollowings(normalized.result));
      dispatch(setPaginateLink(data.next_href, paginateLinkTypes.FOLLOWINGS));
      dispatch(setRequestInProcess(false, requestType));
    });
}

export function mergeActivities(activities) {
  return {
    type: actionTypes.MERGE_ACTIVITIES,
    activities
  };
}

export const fetchActivities = (user, nextHref) => (dispatch, getState) => {
  let requestType = requestTypes.ACTIVITIES;
  let url = getLazyLoadingUrl(user, nextHref, 'activities?limit=20&offset=0');
  let requestInProcess = getState().request[requestType];

  if (requestInProcess) { return; }

  dispatch(setRequestInProcess(true, requestType));

  return fetch(url)
    .then(response => response.json())
    .then(data => {
      const mapAndFiltered = flow(
        filter(isTrack),
        map('origin')
      )(data.collection);
      const normalized = normalize(mapAndFiltered, arrayOf(trackSchema));
      dispatch(mergeEntities(normalized.entities));
      dispatch(mergeActivities(normalized.result));
      dispatch(setPaginateLink(data.next_href, paginateLinkTypes.ACTIVITIES));
      dispatch(setRequestInProcess(false, requestType));
    });
}

export function mergeFollowers(followers) {
  return {
    type: actionTypes.MERGE_FOLLOWERS,
    followers
  };
}

export const fetchFollowers = (user, nextHref) => (dispatch, getState) => {
  let requestType = requestTypes.FOLLOWERS;
  let url = getLazyLoadingUrl(user, nextHref, 'followers?limit=20&offset=0');
  let requestInProcess = getState().request[requestType];

  if (requestInProcess) { return; }

  dispatch(setRequestInProcess(true, requestType));

  return fetch(url)
    .then(response => response.json())
    .then(data => {
      const normalized = normalize(data.collection, arrayOf(userSchema));
      dispatch(mergeEntities(normalized.entities));
      dispatch(mergeFollowers(normalized.result));
      dispatch(setPaginateLink(data.next_href, paginateLinkTypes.FOLLOWERS));
      dispatch(setRequestInProcess(false, requestType));
    });
}

export function mergeFavorites(favorites) {
  return {
    type: actionTypes.MERGE_FAVORITES,
    favorites
  };
}

export const fetchFavorites = (user, nextHref) => (dispatch, getState) => {
  let requestType = requestTypes.FAVORITES;
  let url = getLazyLoadingUrl(user, nextHref, 'favorites?linked_partitioning=1&limit=20&offset=0');
  let requestInProcess = getState().request[requestType];

  if (requestInProcess) { return; }

  dispatch(setRequestInProcess(true, requestType));

  return fetch(url)
    .then(response => response.json())
    .then(data => {
      const normalized = normalize(data.collection, arrayOf(trackSchema));
      dispatch(mergeEntities(normalized.entities));
      dispatch(mergeFavorites(normalized.result));
      dispatch(setPaginateLink(data.next_href, paginateLinkTypes.FAVORITES));
      dispatch(setRequestInProcess(false, requestType));
    });
}

export const fetchAllFollowingsWithFavorites = () => (dispatch, getState) => {

  let nextHref = getState().paginate[paginateLinkTypes.FOLLOWINGS];
  let modifiedNextHref = nextHref ? nextHref.replace("page_size=20", "page_size=199") : null;
  let ignoreInProgress = true;

  let promise = dispatch(fetchFollowings(null, modifiedNextHref, ignoreInProgress));

  promise.then(() => {
    dispatch(fetchFavoritesOfFollowings());

    if (getState().paginate[paginateLinkTypes.FOLLOWINGS]) {
      dispatch(fetchAllFollowingsWithFavorites());
    }
  });
}

const fetchFavoritesOfFollowings = () => (dispatch, getState) => {
  let { followings } = getState().user;

  if (followings) {
    map((following) => {
      if (!getState().followings[following.id]) {
        dispatch(fetchFavoritesOfFollowing(following, ));
      }
    }, followings);
  }
}

const fetchFavoritesOfFollowing = (user, nextHref) => (dispatch, getState) => {
  let requestType = requestTypes.FAVORITES;
  let url = getLazyLoadingUrl(user, nextHref, 'favorites?linked_partitioning=1&limit=200&offset=0');
  let requestInProcess = getState().request[requestType];

  return fetch(url)
    .then(response => response.json())
    .then(data => {
      const normalized = normalize(data.collection, arrayOf(trackSchema));
      dispatch(mergeEntities(normalized.entities));
      dispatch(mergeFollowingsFavorites(user.id, normalized.result));
    });
}
