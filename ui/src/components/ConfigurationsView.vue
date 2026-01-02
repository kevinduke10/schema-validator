<template>
  <div class="configurations-view">
    <div class="header-actions">
      <h2>Configurations</h2>
      <button @click="showCreateForm = !showCreateForm" class="btn btn-primary">
        {{ showCreateForm ? 'Cancel' : 'Create Configuration' }}
      </button>
    </div>

    <div class="filter-section">
      <div class="filter-row">
        <div class="form-group">
          <label>Filter by Name:</label>
          <input 
            v-model="nameFilter" 
            type="text" 
            placeholder="Type to filter configurations by name..."
            class="filter-input"
          />
        </div>
        <div class="form-group">
          <label>Filter by Type:</label>
          <select v-model="typeFilter" class="filter-select">
            <option value="">All Types</option>
            <option value="signal">Signal</option>
            <option value="post-processor">Post-Processor</option>
          </select>
        </div>
        <div class="form-group checkbox-group">
          <label>
            Active
            <input 
              type="checkbox" 
              v-model="showActiveOnly"
              class="filter-checkbox"
            />
          </label>
        </div>
        <button 
          @click="clearFilters" 
          class="btn btn-sm btn-secondary clear-filter-btn"
        >
          Clear All
        </button>
      </div>
    </div>

    <div v-if="showCreateForm" class="form-with-schema">
      <div class="form-container">
        <h3>Create New Configuration</h3>
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label>Schema:</label>
            <select v-model="newConfiguration.schemaId" required>
              <option value="">Select a schema</option>
              <option 
                v-for="schema in activeSchemas" 
                :key="schema.id" 
                :value="schema.id"
              >
                {{ schema.name }} ({{ schema.type }}) - v{{ schema.version }}{{ schema.active ? ' (Active)' : '' }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Type:</label>
            <select v-model="newConfiguration.type" required>
              <option value="signal">Signal</option>
              <option value="post-processor">Post-Processor</option>
            </select>
          </div>
          <div class="form-group">
            <label>Name:</label>
            <input v-model="newConfiguration.name" type="text" required />
          </div>
          <div class="form-group">
            <label>Data (JSON):</label>
            <textarea 
              v-model="configJson" 
              rows="10" 
              required
              placeholder='{"key": "value"}'
            ></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Create</button>
        </form>
      </div>
      <div v-if="selectedCreateSchema" class="schema-panel">
        <h4>Schema Reference</h4>
        <div class="schema-info">
          <div class="schema-header-info">
            <strong>{{ selectedCreateSchema.name }}</strong>
            <span class="badge" :class="selectedCreateSchema.type">{{ selectedCreateSchema.type }}</span>
            <span class="version">v{{ selectedCreateSchema.version }}</span>
            <span v-if="selectedCreateSchema.active" class="badge active">Active</span>
          </div>
          <p v-if="selectedCreateSchema.description" class="schema-description">{{ selectedCreateSchema.description }}</p>
        </div>
        <div class="schema-json">
          <label>Schema Definition:</label>
          <pre>{{ formattedCreateSchema }}</pre>
        </div>
      </div>
    </div>

    <div v-if="cloningConfig" class="form-container">
      <h3>Clone Configuration</h3>
      <p class="clone-hint">Create a copy of this configuration with a new name.</p>
      <form @submit.prevent="handleClone">
        <div class="form-group">
          <label>Schema:</label>
          <input v-model="cloneConfig.schemaId" type="text" disabled />
          <small class="form-hint">Schema ID cannot be changed</small>
        </div>
        <div class="form-group">
          <label>Type:</label>
          <input v-model="cloneConfig.type" type="text" disabled />
        </div>
        <div class="form-group">
          <label>New Name: <span class="required">*</span></label>
          <input v-model="cloneConfig.name" type="text" required />
          <small class="form-hint">Enter a unique name for the cloned configuration</small>
        </div>
        <div class="form-group">
          <label>Data (JSON):</label>
          <textarea 
            v-model="cloneConfigJson" 
            rows="10" 
            required
            placeholder='{"key": "value"}'
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Clone Configuration</button>
          <button type="button" @click="cancelClone" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>

    <div v-if="editingConfig" ref="editFormRef" class="form-with-schema">
      <div class="form-container">
        <h3>Edit Configuration</h3>
        <div v-if="updateError" class="error-message">
          <strong>Error:</strong> {{ updateError }}
          <button @click="clearUpdateError" class="error-close" aria-label="Close error">×</button>
        </div>
        <form @submit.prevent="handleUpdate">
          <div class="form-group">
            <label>Schema:</label>
            <select 
              :value="editConfig.schemaVersionId" 
              @change="handleSchemaIdChange"
              required
            >
              <option 
                v-for="schema in filteredAllSchemas" 
                :key="schema.id" 
                :value="schema.id"
              >
                {{ schema.name }} ({{ schema.type }}) - v{{ schema.version }}{{ schema.active ? ' (Active)' : '' }}
              </option>
            </select>
            <small class="form-hint">Select the schema this configuration should validate against. Active schemas are marked.</small>
          </div>
          <div class="form-group">
            <label>Type:</label>
            <input v-model="editConfig.type" type="text" disabled />
          </div>
          <div class="form-group">
            <label>Name:</label>
            <input v-model="editConfig.name" type="text" disabled />
            <small class="form-hint">Name cannot be changed (used for uniqueness)</small>
          </div>
          <div class="form-group">
            <label>Data (JSON):</label>
            <textarea 
              v-model="editConfigJson" 
              rows="10" 
              required
              placeholder='{"key": "value"}'
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Update</button>
            <button type="button" @click="cancelEdit" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
      <div v-if="selectedEditSchema" class="schema-panel">
        <h4>Schema Reference</h4>
        <div class="schema-info">
          <div class="schema-header-info">
            <strong>{{ selectedEditSchema.name }}</strong>
            <span class="badge" :class="selectedEditSchema.type">{{ selectedEditSchema.type }}</span>
            <span class="version">v{{ selectedEditSchema.version }}</span>
            <span v-if="selectedEditSchema.active" class="badge active">Active</span>
          </div>
          <p v-if="selectedEditSchema.description" class="schema-description">{{ selectedEditSchema.description }}</p>
        </div>
        <div class="schema-json">
          <label>Schema Definition:</label>
          <pre>{{ formattedEditSchema }}</pre>
        </div>
      </div>
    </div>

    <div class="configurations-list">
      <div v-for="config in filteredConfigurations" :key="config.id" class="config-card">
        <div class="config-header">
          <h3>{{ config.name }}</h3>
          <span class="badge" :class="config.type">{{ config.type }}</span>
          <span v-if="config.active" class="badge active">Active</span>
          <span class="version">v{{ config.version }}</span>
        </div>
        <p class="schema-id">Schema: {{ config.schemaId }}</p>
        <div class="config-actions">
          <button @click="viewConfig(config)" class="btn btn-sm">View</button>
          <button @click="startEdit(config)" class="btn btn-sm btn-edit">Edit</button>
          <button @click="startClone(config)" class="btn btn-sm btn-clone">Clone</button>
          <button
            v-if="!config.active"
            @click="setActive(config)"
            class="btn btn-sm btn-active"
          >
            Set Active
          </button>
          <button @click="deleteConfig(config.id)" class="btn btn-sm btn-danger">Delete</button>
        </div>
      </div>
      <div v-if="filteredConfigurations.length === 0" class="empty-state">
        <span v-if="nameFilter || typeFilter">
          No configurations found matching the current filters.
          <span v-if="nameFilter">Name: "{{ nameFilter }}"</span>
          <span v-if="nameFilter && typeFilter">, </span>
          <span v-if="typeFilter">Type: "{{ typeFilter }}"</span>
        </span>
        <span v-else>No configurations found. Create one to get started!</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue';
import { useStore } from 'vuex';
import { configurationsApi } from '../services/api';

export default {
  name: 'ConfigurationsView',
  setup() {
    const store = useStore();
    const showCreateForm = ref(false);
    const editingConfig = ref(null);
    const cloningConfig = ref(null);
    const editFormRef = ref(null);
    const updateError = ref('');
    const newConfiguration = ref({
      schemaId: '',
      type: 'signal',
      name: '',
    });
    const configJson = ref('{}');
    const editConfig = ref({
      id: '',
      configId: '',
      schemaId: '',
      schemaVersionId: '', // Store the selected schema's unique ID to track which version was selected
      type: '',
      name: '',
    });
    const editConfigJson = ref('');
    const cloneConfig = ref({
      schemaId: '',
      type: '',
      name: '',
    });
    const cloneConfigJson = ref('');

    const configurations = computed(() => store.state.configurations);
    const showActiveOnly = ref(false);
    const baseFilteredConfigurations = computed(() => store.getters.filteredConfigurations);
    
    // Apply active filter on top of the base filtered configurations
    const filteredConfigurations = computed(() => {
      let filtered = baseFilteredConfigurations.value;
      
      // Filter by active status if checkbox is checked
      if (showActiveOnly.value) {
        filtered = filtered.filter(c => c.active === true);
      }
      
      return filtered;
    });
    const activeSchemas = computed(() => store.getters.activeSchemas);
    const enabledSchemas = computed(() => store.getters.enabledSchemas);
    const allSchemas = computed(() => store.state.schemas);
    // Filter enabled schemas to only show those matching the configuration's type
    const filteredAllSchemas = computed(() => {
      if (!editingConfig.value) return enabledSchemas.value;
      return enabledSchemas.value.filter(s => s.type === editingConfig.value.type);
    });

    // Get selected schema for create form
    const selectedCreateSchema = computed(() => {
      if (!newConfiguration.value.schemaId) return null;
      return activeSchemas.value.find(s => s.id === newConfiguration.value.schemaId);
    });

    // Get selected schema for edit form
    const selectedEditSchema = computed(() => {
      if (!editConfig.value.schemaVersionId) return null;
      return allSchemas.value.find(s => s.id === editConfig.value.schemaVersionId);
    });

    // Format schema JSON for display
    const formattedCreateSchema = computed(() => {
      if (!selectedCreateSchema.value) return '';
      return JSON.stringify(selectedCreateSchema.value.schema, null, 2);
    });

    const formattedEditSchema = computed(() => {
      if (!selectedEditSchema.value) return '';
      return JSON.stringify(selectedEditSchema.value.schema, null, 2);
    });

    const nameFilter = computed({
      get: () => store.state.configurationNameFilter,
      set: (value) => store.commit('SET_CONFIGURATION_NAME_FILTER', value),
    });
    const typeFilter = computed({
      get: () => store.state.configurationTypeFilter,
      set: (value) => store.commit('SET_CONFIGURATION_TYPE_FILTER', value),
    });

    const clearFilters = () => {
      store.commit('SET_CONFIGURATION_NAME_FILTER', '');
      store.commit('SET_CONFIGURATION_TYPE_FILTER', '');
      showActiveOnly.value = false;
    };

    const handleCreate = async () => {
      try {
        let data;
        try {
          data = JSON.parse(configJson.value);
        } catch (e) {
          alert('Invalid JSON data');
          return;
        }

        // newConfiguration.value.schemaId contains the schema's unique id from the dropdown
        // Find the schema to get its type
        const selectedSchema = activeSchemas.value.find(s => s.id === newConfiguration.value.schemaId);
        if (!selectedSchema) {
          alert('Selected schema not found');
          return;
        }

        await store.dispatch('createConfiguration', {
          schemaId: newConfiguration.value.schemaId, // Store the schema's unique id
          type: selectedSchema.type, // Use the schema's type
          name: newConfiguration.value.name,
          data,
        });

        // Reset form
        newConfiguration.value = { schemaId: '', type: 'signal', name: '' };
        configJson.value = '{}';
        showCreateForm.value = false;
      } catch (error) {
        alert(error.message || 'Failed to create configuration');
      }
    };

    const startEdit = async (config) => {
      editingConfig.value = config;
      
      // config.schemaId now contains the schema's unique id (not schemaId that groups versions)
      // Find the schema by its unique id
      const matchingSchema = enabledSchemas.value.find(s => s.id === config.schemaId);
      
      if (!matchingSchema) {
        updateError.value = 'Schema referenced by this configuration not found. It may have been deleted.';
        return;
      }
      
      editConfig.value = {
        id: config.id,
        configId: config.configId || config.id, // Use configId if available, fallback to id for backward compat
        schemaId: config.schemaId, // This is the schema's unique id
        schemaVersionId: matchingSchema ? matchingSchema.id : config.schemaId, // Use matching schema or fallback
        type: config.type,
        name: config.name,
      };
      editConfigJson.value = JSON.stringify(config.data, null, 2);
      showCreateForm.value = false;
      updateError.value = ''; // Clear any previous errors
      
      // Scroll to edit form after DOM update
      await nextTick();
      if (editFormRef.value) {
        editFormRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const handleUpdate = async () => {
      // Clear any previous errors
      updateError.value = '';
      
      try {
        let data;
        try {
          data = JSON.parse(editConfigJson.value);
        } catch (e) {
          updateError.value = 'Invalid JSON data. Please check the JSON syntax.';
          return;
        }

        // Fetch the current configuration to ensure we have the latest name and type
        let currentConfig;
        try {
          const response = await configurationsApi.getById(editConfig.value.id);
          currentConfig = response.data;
        } catch (error) {
          updateError.value = 'Failed to fetch current configuration. Please refresh and try again.';
          return;
        }

        // Get the selected schema from the form (this is what the user selected in the dropdown)
        // The schemaVersionId contains the schema's unique id
        const selectedSchema = allSchemas.value.find(s => s.id === editConfig.value.schemaVersionId);
        
        if (!selectedSchema) {
          updateError.value = 'Selected schema not found. Please refresh and try again.';
          return;
        }

        await store.dispatch('updateConfiguration', {
          configId: editConfig.value.configId || currentConfig.configId || currentConfig.id,
          updates: {
            name: currentConfig.name, // Use the current configuration's name
            type: currentConfig.type, // Use the current configuration's type
            schemaId: selectedSchema.id, // Store the schema's unique id (not schemaId that groups versions)
            data,
          },
        });

        // Reset edit state on success
        editingConfig.value = null;
        editConfig.value = { id: '', configId: '', schemaId: '', schemaVersionId: '', type: '', name: '' };
        editConfigJson.value = '';
        updateError.value = '';
      } catch (error) {
        // Display error message in the UI
        updateError.value = error.message || 'Failed to update configuration';
        // Scroll to error message
        await nextTick();
        if (editFormRef.value) {
          editFormRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    const clearUpdateError = () => {
      updateError.value = '';
    };

    const handleSchemaIdChange = (event) => {
      // Store the selected schema's unique ID
      editConfig.value.schemaVersionId = event.target.value;
      // Find the schema by ID to get its schemaId
      const selectedSchema = allSchemas.value.find(s => s.id === event.target.value);
      if (selectedSchema) {
        editConfig.value.schemaId = selectedSchema.schemaId;
      }
    };

    const cancelEdit = () => {
      editingConfig.value = null;
      editConfig.value = { id: '', configId: '', schemaId: '', schemaVersionId: '', type: '', name: '' };
      editConfigJson.value = '';
      updateError.value = '';
    };

    const setActive = async (config) => {
      if (!confirm(`Are you sure you want to set configuration '${config.name}' (v${config.version}) as active? This will deactivate any other active versions for configId '${config.configId || config.id}'.`)) {
        return;
      }
      try {
        await store.dispatch('setActiveVersion', {
          configId: config.configId || config.id,
          version: config.version,
        });
      } catch (error) {
        alert(error.message || 'Failed to set configuration as active');
      }
    };

    const startClone = (config) => {
      cloningConfig.value = config;
      cloneConfig.value = {
        schemaId: config.schemaId,
        type: config.type,
        name: '',
      };
      cloneConfigJson.value = JSON.stringify(config.data, null, 2);
      showCreateForm.value = false;
      editingConfig.value = null;
    };

    const handleClone = async () => {
      try {
        if (!cloneConfig.value.name || !cloneConfig.value.name.trim()) {
          alert('Please enter a name for the cloned configuration');
          return;
        }

        let data;
        try {
          data = JSON.parse(cloneConfigJson.value);
        } catch (e) {
          alert('Invalid JSON data');
          return;
        }

        await store.dispatch('createConfiguration', {
          schemaId: cloneConfig.value.schemaId,
          type: cloneConfig.value.type,
          name: cloneConfig.value.name.trim(),
          data,
        });

        // Reset clone state
        cloningConfig.value = null;
        cloneConfig.value = { schemaId: '', type: '', name: '' };
        cloneConfigJson.value = '';
      } catch (error) {
        alert(error.message || 'Failed to clone configuration');
      }
    };

    const cancelClone = () => {
      cloningConfig.value = null;
      cloneConfig.value = { schemaId: '', type: '', name: '' };
      cloneConfigJson.value = '';
    };

    const viewConfig = (config) => {
      alert(JSON.stringify(config, null, 2));
    };

    const deleteConfig = async (id) => {
      if (!confirm('Are you sure you want to delete this configuration?')) {
        return;
      }
      try {
        await store.dispatch('deleteConfiguration', id);
      } catch (error) {
        alert(error.message || 'Failed to delete configuration');
      }
    };

    return {
      showCreateForm,
      editingConfig,
      cloningConfig,
      newConfiguration,
      configJson,
      editConfig,
      editConfigJson,
      cloneConfig,
      cloneConfigJson,
      configurations,
      filteredConfigurations,
      activeSchemas,
      enabledSchemas,
      allSchemas,
      filteredAllSchemas,
      selectedCreateSchema,
      selectedEditSchema,
      formattedCreateSchema,
      formattedEditSchema,
      nameFilter,
      typeFilter,
      showActiveOnly,
      clearFilters,
      editFormRef,
      updateError,
      clearUpdateError,
      handleCreate,
      startEdit,
      handleUpdate,
      handleSchemaIdChange,
      cancelEdit,
      startClone,
      handleClone,
      cancelClone,
      viewConfig,
      setActive,
      deleteConfig,
    };
  },
};
</script>

<style scoped>
.configurations-view {
  padding: 20px 0;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.form-with-schema {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

@media (max-width: 1024px) {
  .form-with-schema {
    grid-template-columns: 1fr;
  }
}

.form-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.schema-panel {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #42b883;
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.schema-panel h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 18px;
}

.schema-info {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ddd;
}

.schema-header-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.schema-header-info strong {
  font-size: 16px;
  color: #2c3e50;
}

.schema-description {
  color: #666;
  font-size: 14px;
  margin: 10px 0 0 0;
  line-height: 1.5;
}

.schema-json {
  margin-top: 15px;
}

.schema-json label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
  font-size: 14px;
}

.schema-json pre {
  background: #2c3e50;
  color: #e8e8e8;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
}

.form-group textarea {
  font-size: 12px;
}

.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  color: #2c3e50;
}

.form-group select option {
  color: #2c3e50;
  background: white;
}

.configurations-list {
  display: grid;
  gap: 15px;
}

.config-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.config-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.config-header h3 {
  margin: 0;
  flex: 1;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.badge.signal {
  background: #e3f2fd;
  color: #1976d2;
}

.badge.post-processor {
  background: #f3e5f5;
  color: #7b1fa2;
}

.badge.active {
  background: #e8f5e9;
  color: #388e3c;
}

.version {
  color: #666;
  font-size: 14px;
}

.schema-id {
  color: #666;
  font-size: 14px;
  margin: 10px 0;
}

.btn-active {
  background: #27ae60;
  color: white;
}

.btn-active:hover {
  background: #229954;
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-primary {
  background: #42b883;
  color: white;
}

.btn-primary:hover {
  background: #35a372;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-edit {
  background: #3498db;
  color: white;
}

.btn-edit:hover {
  background: #2980b9;
}

.btn-clone {
  background: #9b59b6;
  color: white;
}

.btn-clone:hover {
  background: #8e44ad;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.clone-hint {
  color: #666;
  font-size: 14px;
  margin-bottom: 15px;
  padding: 10px;
  background: #e8f4f8;
  border-left: 3px solid #3498db;
  border-radius: 4px;
}

.required {
  color: #e74c3c;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border-left: 4px solid #c33;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.error-message strong {
  display: block;
  margin-bottom: 5px;
}

.error-close {
  background: none;
  border: none;
  color: #c33;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.error-close:hover {
  opacity: 1;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.filter-section {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-section .form-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
  flex: 1;
  min-width: 200px;
}

.filter-section label {
  margin-bottom: 0;
  font-weight: 600;
  min-width: 120px;
}

.filter-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.checkbox-group {
  flex: 0 0 auto;
  min-width: 100px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-weight: normal;
  min-width: auto;
  font-size: 14px;
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.filter-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  color: #2c3e50;
}

.filter-select option {
  color: #2c3e50;
  background: white;
}

.clear-filter-btn {
  margin-left: auto;
  align-self: flex-end;
}
</style>

