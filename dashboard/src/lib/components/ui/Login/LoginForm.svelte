<script lang="ts">
	// import Logo from '$lib/assets/icons/Logo.svelte';
	import BiGoogle from '~icons/bi/google';
	import MingcuteMailSendLine from '~icons/mingcute/mail-send-line';
	import PhKeyBold from '~icons/ph/key-bold';
	import { signIn } from '@auth/sveltekit/client';

	let email = $state('');
	let password = '';
	let error = $state('');

	let openCredentials = false;
	let openMagicLink = $state(true);

	function handleGoogleSignIn() {
		signIn('google');
	}

	async function handleEmailSignIn() {
		const result = await signIn('Credentials', {
			email,
			password
		});
		if (result?.ok) {
			closeModal();
		} else {
			error = 'User authorization failed';
			console.error('User authorization failed', result);
		}
	}

	function handleMagicLinkSignIn() {
		signIn('resend', { email });
	}

	function loginWithSocialProvider(provider: string) {
		signIn(provider);
	}
	function closeModal() {
		document.getElementById('login-modal').checked = false;
	}
</script>

<div>
	<h1 class="mb-5 text-center text-2xl font-bold">Login Access</h1>
	<div class="flex flex-col gap-4 p-5">
		<button type="button" class="btn btn-primary" onclick={() => loginWithSocialProvider('google')}>
			<BiGoogle />
			Login with Google
		</button>

		<div class="mt-3"></div>
		<button
			class="btn"
			class:hidden={openMagicLink}
			onclick={() => (openMagicLink = !openMagicLink)}
		>
			<MingcuteMailSendLine class="size-5" />
			Send Magic Link
		</button>
		<form
			class="rounded-box border-base-300 border p-3"
			class:hidden={!openMagicLink}
			onsubmit={handleMagicLinkSignIn}
		>
			<div class="form-control">
				<input
					bind:value={email}
					autofocus
					type="email"
					placeholder="Enter your email"
					class="input input-bordered"
					required
				/>
			</div>

			{#if error}
				<div class="text-error mt-2">{error}</div>
			{/if}

			<button type="submit" class="btn btn-outline btn-secondary mt-3 w-full">
				<MingcuteMailSendLine class="size-5" />
				Send Magic Link
			</button>
		</form>

		<!-- Login with Email and Password -->
		<!--
		<button
			class="btn"
			class:hidden={openCredentials}
			onclick={() => (openCredentials = !openCredentials)}
		>
			<PhKeyBold class="size-5" />
			Email and Password
		</button>

		<form
			class="p-3 border rounded-box border-base-300"
			class:hidden={!openCredentials}
			onsubmit|preventDefault={handleEmailSignIn}
		>
			<div class="form-control">
				<input
					bind:value={email}
					type="email"
					placeholder="Enter your email"
					class="input input-bordered"
					required
				/>
			</div>

			<div class="form-control mt-3">
				<input
					bind:value={password}
					type="password"
					placeholder="Enter your password"
					class="input input-bordered"
					required
				/>
			</div>

			{#if error}
				<div class="text-error mt-2">{error}</div>
			{/if}

			<button type="submit" class="btn w-full mt-3 btn-outline btn-secondary">
				<PhKeyBold class="size-5" />
				Login with Email and Password
			</button>
		</form>
		-->
	</div>
</div>
