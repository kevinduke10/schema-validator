<template>
  <div id="app">
    <header>
      <h1>Schema Validator</h1>
    </header>
    <main>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-if="error" class="error">{{ error }}</div>
      
      <div class="tabs">
        <button 
          :class="{ active: activeTab === 'schemas' }"
          @click="activeTab = 'schemas'"
        >
          Schemas
        </button>
        <button 
          :class="{ active: activeTab === 'configurations' }"
          @click="activeTab = 'configurations'"
        >
          Configurations
        </button>
      </div>

      <SchemasView v-if="activeTab === 'schemas'" />
      <ConfigurationsView v-if="activeTab === 'configurations'" />
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import SchemasView from './components/SchemasView.vue';
import ConfigurationsView from './components/ConfigurationsView.vue';

export default {
  name: 'App',
  components: {
    SchemasView,
    ConfigurationsView,
  },
  setup() {
    const store = useStore();
    const activeTab = ref('schemas');

    const loading = computed(() => store.state.loading);
    const error = computed(() => store.state.error);

    onMounted(async () => {
      await store.dispatch('fetchSchemas');
      await store.dispatch('fetchConfigurations');
    });

    return {
      activeTab,
      loading,
      error,
    };
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

header h1 {
  margin: 0;
  color: #42b883;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tabs button {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.3s;
}

.tabs button:hover {
  color: #42b883;
}

.tabs button.active {
  color: #42b883;
  border-bottom-color: #42b883;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error {
  background-color: #fee;
  color: #c33;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border-left: 4px solid #c33;
}
</style>
