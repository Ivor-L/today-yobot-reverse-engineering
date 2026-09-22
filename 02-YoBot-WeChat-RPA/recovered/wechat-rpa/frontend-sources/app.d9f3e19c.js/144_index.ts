import { createStore } from 'vuex'

interface UserInfo {
  nickname: string;
  account_id: string;
}

interface State {
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
}

export default createStore({
  state: {
    userInfo: null,
    isLoggedIn: false
  },
  getters: {
    getUserInfo: (state: State) => state.userInfo,
    isLoggedIn: (state: State) => state.isLoggedIn
  },
  mutations: {
    SET_USER_INFO(state: State, userInfo: UserInfo) {
      state.userInfo = userInfo;
      state.isLoggedIn = true;
    },
    CLEAR_USER_INFO(state: State) {
      state.userInfo = null;
      state.isLoggedIn = false;
    }
  },
  actions: {
    setUserInfo({ commit }, userInfo: UserInfo) {
      commit('SET_USER_INFO', userInfo);
    },
    logout({ commit }) {
      commit('CLEAR_USER_INFO');
    }
  },
  modules: {
  }
})