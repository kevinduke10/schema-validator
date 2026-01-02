<template>
  <div class="schemas-view">
    <div class="header-actions">
      <h2>Schemas</h2>
      <button @click="showCreateForm = !showCreateForm" class="btn btn-primary">
        {{ showCreateForm ? 'Cancel' : 'Create Schema' }}
      </button>
    </div>

    <div class="filter-section">
      <div class="filter-row">
        <div class="form-group">
          <label>Filter by Name:</label>
          <input 
            v-model="nameFilter" 
            type="text" 
            placeholder="Type to filter schemas by name..."
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

    <div v-if="showCreateForm" class="form-container">
      <h3>Create New Schema</h3>
      <form @submit.prevent="handleCreate">
        <div class="form-group">
          <label>Name:</label>
          <input v-model="newSchema.name" type="text" required />
        </div>
        <div class="form-group">
          <label>Type:</label>
          <select v-model="newSchema.type" required>
            <option value="signal">Signal</option>
            <option value="post-processor">Post-Processor</option>
          </select>
        </div>
        <div class="form-group">
          <label>Description:</label>
          <input v-model="newSchema.description" type="text" />
        </div>
        <div class="form-group">
          <label>Schema (JSON):</label>
          <textarea 
            v-model="schemaJson" 
            rows="10" 
            required
            placeholder='{"type": "object", "properties": {...}}'
          ></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Create</button>
      </form>
    </div>

    <div v-if="cloningSchema" class="form-container">
      <h3>Clone Schema</h3>
      <p class="clone-hint">Create a copy of this schema with a new name. The new schema will be version 1.</p>
      <form @submit.prevent="handleClone">
        <div class="form-group">
          <label>New Name: <span class="required">*</span></label>
          <input v-model="cloneSchema.name" type="text" required />
          <small class="form-hint">Enter a unique name for the cloned schema</small>
        </div>
        <div class="form-group">
          <label>Type:</label>
          <input v-model="cloneSchema.type" type="text" disabled />
        </div>
        <div class="form-group">
          <label>Description:</label>
          <input v-model="cloneSchema.description" type="text" />
        </div>
        <div class="form-group">
          <label>Schema (JSON):</label>
          <textarea 
            v-model="cloneSchemaJson" 
            rows="10" 
            required
            placeholder='{"type": "object", "properties": {...}}'
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Clone Schema</button>
          <button type="button" @click="cancelClone" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>

    <div v-if="editingSchema" ref="editFormRef" class="form-container">
      <h3>Edit Schema</h3>
      <div v-if="updateError" class="error-message">
        <strong>Error:</strong> {{ updateError }}
        <button @click="clearUpdateError" class="error-close" aria-label="Close error">×</button>
      </div>
      <form @submit.prevent="handleUpdate">
        <div class="form-group">
          <label>Name:</label>
          <input v-model="editSchema.name" type="text" disabled />
          <small class="form-hint">Name cannot be changed (used for uniqueness)</small>
        </div>
        <div class="form-group">
          <label>Type:</label>
          <input v-model="editSchema.type" type="text" disabled />
        </div>
        <div class="form-group">
          <label>Description:</label>
          <input v-model="editSchema.description" type="text" />
        </div>
        <div class="form-group">
          <label>Schema (JSON):</label>
          <textarea 
            v-model="editSchemaJson" 
            rows="10" 
            required
            placeholder='{"type": "object", "properties": {...}}'
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Update</button>
          <button type="button" @click="cancelEdit" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </div>

    <div class="schemas-list">
      <div v-for="schema in filteredSchemas" :key="schema.id" class="schema-card">
        <div class="schema-header">
          <h3>{{ schema.name }}</h3>
          <span class="badge" :class="schema.type">{{ schema.type }}</span>
          <span v-if="schema.active" class="badge active">Active</span>
          <span v-if="schema.enabled === false" class="badge disabled">Disabled</span>
          <span class="version">v{{ schema.version }}</span>
        </div>
        <p v-if="schema.description" class="description">{{ schema.description }}</p>
        <div class="schema-actions">
          <button @click="viewSchema(schema)" class="btn btn-sm">View</button>
          <button @click="startEdit(schema)" class="btn btn-sm btn-edit">Edit</button>
          <button @click="startClone(schema)" class="btn btn-sm btn-clone">Clone</button>
          <button 
            v-if="!schema.active"
            @click="setActive(schema)" 
            class="btn btn-sm btn-active"
          >
            Set Active
          </button>
          <button 
            @click="toggleEnabled(schema)" 
            class="btn btn-sm"
            :class="schema.enabled === false ? 'btn-enable' : 'btn-disable'"
          >
            {{ schema.enabled === false ? 'Enable' : 'Disable' }}
          </button>
          <button @click="deleteSchema(schema.id)" class="btn btn-sm btn-danger">Delete</button>
        </div>
      </div>
      <div v-if="filteredSchemas.length === 0" class="empty-state">
        <span v-if="nameFilter || typeFilter || showActiveOnly">
          No schemas found matching the current filters.
          <span v-if="nameFilter">Name: "{{ nameFilter }}"</span>
          <span v-if="nameFilter && (typeFilter || showActiveOnly)">, </span>
          <span v-if="typeFilter">Type: "{{ typeFilter }}"</span>
          <span v-if="(nameFilter || typeFilter) && showActiveOnly">, </span>
          <span v-if="showActiveOnly">Active only</span>
        </span>
        <span v-else>No schemas found. Create one to get started!</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue';
import { useStore } from 'vuex';
import { schemasApi } from '../services/api';

export default {
  name: 'SchemasView',
  setup() {
    const store = useStore();
    const showCreateForm = ref(false);
    const editingSchema = ref(null);
    const cloningSchema = ref(null);
    const editFormRef = ref(null);
    const updateError = ref('');
    const showActiveOnly = ref(false);
    const newSchema = ref({
      name: '',
      type: 'signal',
      description: '',
    });
    const schemaJson = ref('{"type": "object", "properties": {}}');
    const editSchema = ref({
      schemaId: '',
      name: '',
      type: '',
      description: '',
    });
    const editSchemaJson = ref('');
    const cloneSchema = ref({
      name: '',
      type: '',
      description: '',
    });
    const cloneSchemaJson = ref('');

    const schemas = computed(() => store.state.schemas);
    const baseFilteredSchemas = computed(() => store.getters.filteredSchemas);
    
    // Apply active filter on top of the base filtered schemas
    const filteredSchemas = computed(() => {
      let filtered = baseFilteredSchemas.value;
      
      // Filter by active status if checkbox is checked
      if (showActiveOnly.value) {
        filtered = filtered.filter(s => s.active === true);
      }
      
      return filtered;
    });
    
    const nameFilter = computed({
      get: () => store.state.schemaNameFilter,
      set: (value) => store.commit('SET_SCHEMA_NAME_FILTER', value),
    });
    const typeFilter = computed({
      get: () => store.state.schemaTypeFilter,
      set: (value) => store.commit('SET_SCHEMA_TYPE_FILTER', value),
    });

    const clearFilters = () => {
      store.commit('SET_SCHEMA_NAME_FILTER', '');
      store.commit('SET_SCHEMA_TYPE_FILTER', '');
      showActiveOnly.value = false;
    };

    const handleCreate = async () => {
      try {
        let schema;
        try {
          schema = JSON.parse(schemaJson.value);
        } catch (e) {
          alert('Invalid JSON schema');
          return;
        }

        await store.dispatch('createSchema', {
          ...newSchema.value,
          schema,
        });

        // Reset form
        newSchema.value = { name: '', type: 'signal', description: '' };
        schemaJson.value = '{"type": "object", "properties": {}}';
        showCreateForm.value = false;
      } catch (error) {
        alert(error.message || 'Failed to create schema');
      }
    };

    const startEdit = async (schema) => {
      editingSchema.value = schema;
      editSchema.value = {
        schemaId: schema.schemaId,
        name: schema.name,
        type: schema.type,
        description: schema.description || '',
      };
      editSchemaJson.value = JSON.stringify(schema.schema, null, 2);
      showCreateForm.value = false;
      
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
        let schema;
        try {
          schema = JSON.parse(editSchemaJson.value);
        } catch (e) {
          updateError.value = 'Invalid JSON schema. Please check the JSON syntax.';
          return;
        }

        // Fetch the current active schema to ensure we have the latest name and type
        let currentSchema;
        try {
          const response = await schemasApi.getBySchemaId(editSchema.value.schemaId);
          currentSchema = response.data;
        } catch (error) {
          updateError.value = 'Failed to fetch current schema. Please refresh and try again.';
          return;
        }

        await store.dispatch('updateSchema', {
          schemaId: editSchema.value.schemaId,
          updates: {
            name: currentSchema.name, // Use the current active schema's name
            type: currentSchema.type, // Use the current active schema's type
            description: editSchema.value.description,
            schema,
          },
        });

        // Reset edit state on success
        editingSchema.value = null;
        editSchema.value = { schemaId: '', name: '', type: '', description: '' };
        editSchemaJson.value = '';
        updateError.value = '';
        
        // Note: fetchSchemas is called automatically in the store action
      } catch (error) {
        // Display error message in the UI
        updateError.value = error.message || 'Failed to update schema';
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

    const cancelEdit = () => {
      editingSchema.value = null;
      editSchema.value = { schemaId: '', name: '', type: '', description: '' };
      editSchemaJson.value = '';
      updateError.value = '';
    };

    const startClone = (schema) => {
      cloningSchema.value = schema;
      cloneSchema.value = {
        name: '',
        type: schema.type,
        description: schema.description || '',
      };
      cloneSchemaJson.value = JSON.stringify(schema.schema, null, 2);
      showCreateForm.value = false;
      editingSchema.value = null;
    };

    const handleClone = async () => {
      try {
        if (!cloneSchema.value.name || !cloneSchema.value.name.trim()) {
          alert('Please enter a name for the cloned schema');
          return;
        }

        let schema;
        try {
          schema = JSON.parse(cloneSchemaJson.value);
        } catch (e) {
          alert('Invalid JSON schema');
          return;
        }

        await store.dispatch('createSchema', {
          name: cloneSchema.value.name.trim(),
          type: cloneSchema.value.type,
          description: cloneSchema.value.description,
          schema,
        });

        // Reset clone state
        cloningSchema.value = null;
        cloneSchema.value = { name: '', type: '', description: '' };
        cloneSchemaJson.value = '';
      } catch (error) {
        alert(error.message || 'Failed to clone schema');
      }
    };

    const cancelClone = () => {
      cloningSchema.value = null;
      cloneSchema.value = { name: '', type: '', description: '' };
      cloneSchemaJson.value = '';
    };

    const viewSchema = (schema) => {
      alert(JSON.stringify(schema, null, 2));
    };

    const setActive = async (schema) => {
      if (!confirm(`Are you sure you want to set version ${schema.version} of "${schema.name}" as active? This will deactivate all other versions of this schema.`)) {
        return;
      }
      
      try {
        await store.dispatch('setActiveVersion', {
          schemaId: schema.schemaId,
          version: schema.version,
        });
      } catch (error) {
        alert(error.message || 'Failed to set schema as active');
      }
    };

    const toggleEnabled = async (schema) => {
      // If enabled is undefined or true, disable it. If false, enable it.
      const newEnabledState = schema.enabled === false;
      const action = newEnabledState ? 'enable' : 'disable';
      
      if (!confirm(`Are you sure you want to ${action} this schema? ${newEnabledState ? '' : 'It will no longer appear in configuration dropdowns.'}`)) {
        return;
      }
      
      try {
        await store.dispatch('toggleSchemaEnabled', {
          id: schema.id,
          enabled: newEnabledState,
        });
      } catch (error) {
        alert(error.message || `Failed to ${action} schema`);
      }
    };

    const deleteSchema = async (id) => {
      if (!confirm('Are you sure you want to delete this schema? This will delete this specific schema version.')) {
        return;
      }
      try {
        await store.dispatch('deleteSchema', id);
      } catch (error) {
        alert(error.message || 'Failed to delete schema');
      }
    };

    return {
      showCreateForm,
      editingSchema,
      cloningSchema,
      newSchema,
      schemaJson,
      editSchema,
      editSchemaJson,
      cloneSchema,
      cloneSchemaJson,
      schemas,
      filteredSchemas,
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
      cancelEdit,
      startClone,
      handleClone,
      cancelClone,
      setActive,
      toggleEnabled,
      viewSchema,
      deleteSchema,
    };
  },
};
</script>

<style scoped>
.schemas-view {
  padding: 20px 0;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.form-container {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
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

.schemas-list {
  display: grid;
  gap: 15px;
}

.schema-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.schema-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.schema-header h3 {
  margin: 0;
  flex: 1;
  text-align: left;
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

.description {
  color: #666;
  margin: 10px 0;
  text-align: left;
}

.schema-actions {
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

.btn-active {
  background: #27ae60;
  color: white;
}

.btn-active:hover {
  background: #229954;
}

.btn-disable {
  background: #f39c12;
  color: white;
}

.btn-disable:hover {
  background: #e67e22;
}

.btn-enable {
  background: #27ae60;
  color: white;
}

.btn-enable:hover {
  background: #229954;
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

.checkbox-group {
  flex: 0 0 auto;
  min-width: 200px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-weight: normal;
  font-size: 14px;
  min-width: auto;
  margin-bottom: 0;
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  flex-shrink: 0;
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

