import { cloneDeep } from "lodash";
import Vue from "vue";
import Vuex from "vuex";
import VuexPersistence from "vuex-persist";
const vuexLocal = new VuexPersistence({
    storage: window.sessionStorage,
    reducer: (state) => {
        let saveState = {
            session: {
                create: state.session.create,
            },
            target: state.target,
        };
        return saveState;
    },
    filter: (mutation) => {
        return ["reset", "setTargetResource", "setActiveCollection"].includes(mutation.type);
    },
});

Vue.use(Vuex);

const mutations = {
    reset: (state) => {
        state = cloneDeep(resetState());
    },
    saveConfiguration: (state, payload) => {
        state.configuration = { ...payload };
    },
    setUserData(state, payload) {
        state.userData = { ...payload };
    },
};

const actions = {};

export const store = new Vuex.Store({
    state: resetState(),
    mutations,
    actions,
    modules: {},
    plugins: [vuexLocal.plugin],
});

function resetState() {
    return {
        configuration: undefined,
        userData: {},
    };
}
