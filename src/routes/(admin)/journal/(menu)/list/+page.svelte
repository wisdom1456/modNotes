<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"

  let adminSection: Writable<String> = getContext("adminSection")
  adminSection.set("list")

  export let data

  console.log(data)
</script>

<svelte:head>
  <title>List</title>
</svelte:head>

This is the list page.
