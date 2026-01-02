import { createStore } from 'vuex';
import { schemasApi, configurationsApi } from '../services/api';

export default createStore({
  state: {
    schemas: [],
    configurations: [],
    loading: false,
    error: null,
    schemaNameFilter: '',
    schemaTypeFilter: '',
    configurationNameFilter: '',
    configurationTypeFilter: '',
  },
  mutations: {
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
    SET_SCHEMAS(state, schemas) {
      state.schemas = schemas;
    },
    ADD_SCHEMA(state, schema) {
      state.schemas.push(schema);
    },
    UPDATE_SCHEMA(state, updatedSchema) {
      // When updating a schema, a new version is created with a new id
      // Remove the old active version for this schemaId and add the new one
      state.schemas = state.schemas.filter(s => 
        !(s.schemaId === updatedSchema.schemaId && s.active)
      );
      state.schemas.push(updatedSchema);
    },
    REMOVE_SCHEMA(state, id) {
      state.schemas = state.schemas.filter(s => s.id !== id);
    },
    CLEAR_SCHEMAS(state) {
      state.schemas = [];
    },
    SET_CONFIGURATIONS(state, configurations) {
      state.configurations = configurations;
    },
    ADD_CONFIGURATION(state, configuration) {
      state.configurations.push(configuration);
    },
    UPDATE_CONFIGURATION(state, updatedConfiguration) {
      // When updating a configuration, a new version is created with a new id
      // Remove the old active version for this configId and add the new one
      state.configurations = state.configurations.filter(c => 
        !(c.configId === updatedConfiguration.configId && c.active)
      );
      state.configurations.push(updatedConfiguration);
    },
    REMOVE_CONFIGURATION(state, id) {
      state.configurations = state.configurations.filter(c => c.id !== id);
    },
    CLEAR_CONFIGURATIONS(state) {
      state.configurations = [];
    },
    SET_SCHEMA_NAME_FILTER(state, filter) {
      state.schemaNameFilter = filter;
    },
    SET_SCHEMA_TYPE_FILTER(state, filter) {
      state.schemaTypeFilter = filter;
    },
    SET_CONFIGURATION_NAME_FILTER(state, filter) {
      state.configurationNameFilter = filter;
    },
    SET_CONFIGURATION_TYPE_FILTER(state, filter) {
      state.configurationTypeFilter = filter;
    },
  },
  actions: {
    // Schemas
    async fetchSchemas({ commit }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await schemasApi.getAll();
        commit('SET_SCHEMAS', response.data);
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async createSchema({ commit }, schemaData) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await schemasApi.create(schemaData);
        commit('ADD_SCHEMA', response.data);
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async updateSchema({ commit, dispatch }, { schemaId, updates }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await schemasApi.update(schemaId, updates);
        commit('UPDATE_SCHEMA', response.data);
        // Refresh schemas to ensure we have the latest versions
        await dispatch('fetchSchemas');
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async setActiveVersion({ commit, dispatch }, { schemaId, version }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await schemasApi.setActiveVersion(schemaId, version);
        commit('UPDATE_SCHEMA', response.data);
        // Refresh schemas to ensure we have the latest state
        await dispatch('fetchSchemas');
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async toggleSchemaEnabled({ commit, dispatch }, { id, enabled }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await schemasApi.toggleEnabled(id, enabled);
        commit('UPDATE_SCHEMA', response.data);
        // Refresh schemas to ensure we have the latest state
        await dispatch('fetchSchemas');
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async deleteSchema({ commit }, id) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        await schemasApi.delete(id);
        commit('REMOVE_SCHEMA', id);
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async deleteAllSchemas({ commit }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        await schemasApi.deleteAll();
        commit('CLEAR_SCHEMAS');
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async validateSchema({ commit }, { schemaId, data }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await schemasApi.validate(schemaId, data);
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    // Configurations
    async fetchConfigurations({ commit }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await configurationsApi.getAll();
        commit('SET_CONFIGURATIONS', response.data);
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async createConfiguration({ commit }, configData) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await configurationsApi.create(configData);
        commit('ADD_CONFIGURATION', response.data);
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async updateConfiguration({ commit, dispatch }, { configId, updates }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await configurationsApi.update(configId, updates);
        commit('UPDATE_CONFIGURATION', response.data);
        await dispatch('fetchConfigurations'); // Refresh configurations to get latest data
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async setActiveVersion({ commit, dispatch }, { configId, version }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        const response = await configurationsApi.setActiveVersion(configId, version);
        commit('UPDATE_CONFIGURATION', response.data);
        await dispatch('fetchConfigurations'); // Refresh configurations to get latest active status
        return response.data;
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async deleteConfiguration({ commit }, id) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        await configurationsApi.delete(id);
        commit('REMOVE_CONFIGURATION', id);
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async deleteAllConfigurations({ commit }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      try {
        await configurationsApi.deleteAll();
        commit('CLEAR_CONFIGURATIONS');
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.error || error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
  },
  getters: {
    schemasByType: (state) => (type) => {
      return state.schemas.filter(s => s.type === type);
    },
    activeSchemas: (state) => {
      return state.schemas.filter(s => s.active);
    },
    filteredSchemas: (state) => {
      let filtered = state.schemas;
      
      // Filter by name
      if (state.schemaNameFilter) {
        const nameFilter = state.schemaNameFilter.toLowerCase();
        filtered = filtered.filter(s => 
          s.name.toLowerCase().includes(nameFilter)
        );
      }
      
      // Filter by type
      if (state.schemaTypeFilter) {
        filtered = filtered.filter(s => 
          s.type === state.schemaTypeFilter
        );
      }
      
      return filtered;
    },
    enabledSchemas: (state) => {
      // Only return schemas where enabled is not false (undefined or true are both considered enabled)
      return state.schemas.filter(s => s.enabled !== false);
    },
    configurationsBySchemaId: (state) => (schemaId) => {
      return state.configurations.filter(c => c.schemaId === schemaId);
    },
    configurationsByType: (state) => (type) => {
      return state.configurations.filter(c => c.type === type);
    },
    filteredConfigurations: (state) => {
      let filtered = state.configurations;
      
      // Filter by name
      if (state.configurationNameFilter) {
        const nameFilter = state.configurationNameFilter.toLowerCase();
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(nameFilter)
        );
      }
      
      // Filter by type
      if (state.configurationTypeFilter) {
        filtered = filtered.filter(c => 
          c.type === state.configurationTypeFilter
        );
      }
      
      return filtered;
    },
  },
});

