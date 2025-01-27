import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import Icons from 'unplugin-icons/vite'

import VitePluginRestart from 'vite-plugin-restart';


export default defineConfig({
	server: {
		host: '0.0.0.0',
		port: 5173
	},
	plugins: [
		enhancedImages(),

		VitePluginRestart({ restart: ['./content/**'] }),

		sveltekit(),
		Icons({
			compiler: 'svelte',
			autoInstall: true,
		}),
	],
	// optimizeDeps: {
	// 	disabled: true,
	// },
});
