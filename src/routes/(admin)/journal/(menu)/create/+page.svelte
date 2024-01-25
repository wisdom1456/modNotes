<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"

  let adminSection: Writable<String> = getContext("adminSection")
  adminSection.set("create")

  export let data

  console.log(data)
</script>

<svelte:head>
  <title>Create</title>
</svelte:head>

This is the create page.
