---
title: "Interactive Select component using Phoenix LiveView and vanilla JS Hook"
description: "Learn to build a custom select input component in Phoenix LiveView with a JS Hook. This guide covers autocomplete, keyboard navigation, and seamless Phoenix form integration. Perfect for interactive, reusable components!"
date: 2024-03-19
updated: 2024-03-26
layout: post
meta_type: article
tags: posts
keywords: phoenix, liveview, select, dropdown, component, js-hook, hook, custom input, keyboard navigation, js hook rendering, livecomponent, liveview, elixir, erlang, web, development, programming, software, engineering, javascript, html, css, frontend, backend, fullstack, web, developer, web, engineer, react, nodejs, postgresql
canonical: https://aurmartin.fr/posts/phoenix-liveview-select/
---

## Introduction

In this post, we will learn how to build a select input component using Phoenix LiveView and a vanilla JS Hook. This is a solid introduction on how to implement custom and interactive components in Phoenix LiveView. You will also learn how to handle keyboard navigation, JS-to-LiveView communication, and how to fix re-rendering issues.

There are already a couple of articles on the web about this but none of them fitted my needs. I wanted to build a select component that you can plug in a LiveView form to replace a classic select input.

Here are the features I wanted to implement:
- Custom option item rendering (including images),
- Auto-complete,
- Compatible with Phoenix forms,
- Keyboard navigation.

To use our component, we will build a simple form to create a new employee object. The form will have a select field to choose the employee's country. We will use a sample list of countries as the select options.

Here is the final result we want to achieve:

<img src="{{ '/images/phoenix-liveview-select/final-demo.gif' | url }}" alt="A gif showing the final result of the select component." style="max-width: 100%;" />

I will cover every step to build this component from scratch, starting from a newly generated Phoenix LiveView project. We will be using Phoenix LiveView 1.7 with TailwindCSS.

## Step 1: Project setup

First, let's generate a new Phoenix LiveView project:

```bash
mix phx.new phoenix_liveview_select
```

Now we need sample data to test our select component. We will be using a sample countries list for this purpose. Create the file `lib/phoenix_liveview_select/countries.ex` and add the following code:

```elixir
defmodule PhoenixLiveviewSelect.Countries do
  @countries [
    %{name: "France", code: "FR"},
    %{name: "United States", code: "US"},
    %{name: "United Kingdom", code: "UK"},
    %{name: "Germany", code: "DE"},
    %{name: "Spain", code: "ES"},
    %{name: "Italy", code: "IT"},
    %{name: "Canada", code: "CA"},
    %{name: "Australia", code: "AU"},
    %{name: "Brazil", code: "BR"},
    %{name: "India", code: "IN"},
    %{name: "China", code: "CN"},
    %{name: "Japan", code: "JP"},
    %{name: "Russia", code: "RU"},
    %{name: "South Africa", code: "ZA"},
    %{name: "Nigeria", code: "NG"},
  ]

  def search_contries(name) do
    @countries
    |> Enum.filter(fn country ->
      String.contains?(String.downcase(country.name), String.downcase(name))
    end)
  end

  def country_image(%{code: code}) do
    "https://flagsapi.com/#{code}/flat/64.png"
  end
end
```

- The `search_countries/1` function will be used to filter the countries list based on the search query.
- We also implement the `country_image/1` function to get the flag image of a country. We will use this image in our select.

## Step 2: Building the create employee form

We just need a simple form with a text field and our select component. Let's create the live form in the `lib/phoenix_liveview_select_web/live/employee_live/index.ex` file:

```elixir
defmodule PhoenixLiveviewSelectWeb.EmployeeLive.Index do
  use PhoenixLiveviewSelectWeb, :live_view

  @impl true
  def render(assigns) do
    ~H"""
    <.header>Create Employee</.header>

    <.simple_form for={@form} id="employee-form" phx-change="validate" phx-submit="save">
      <.input name="name" label="Name" field={@form[:name]} />

      <.button type="submit">Save</.button>
    </.simple_form>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    socket =
      socket
      |> assign(form: to_form(%{}))

    {:ok, socket}
  end

  @impl true
  def handle_event("validate", employee_params, socket) do
    socket =
      socket
      |> assign(form: to_form(employee_params))

    {:noreply, socket}
  end

  def handle_event("save", employee_params, socket) do
    socket =
      socket
      |> assign(form: to_form(employee_params))
      |> put_flash(:info, "Success: #{inspect(employee_params)}")

    {:noreply, socket}
  end
end
```

For the moment we only have the name input field. We will add our select component later. You can then add this liveview to your router in the `lib/phoenix_liveview_select_web/router.ex` file:

```elixir
scope "/", PhoenixLiveviewSelectWeb do
  pipe_through :browser

  live "/", EmployeeLive.Index, :index
end
```

You should be able to start your Phoenix application using `mix phx.server` and access the form at `http://localhost:4000`.

## Step 3: The LiveComponent

Now that we have our `EmployeeLive.Index` liveview with a `.simple_form` working properly, we can start building our select component.

Our component will be composed of a [LiveComponent](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveComponent.html) and a custom [JS Hook](https://hexdocs.pm/phoenix_live_view/js-interop.html#client-hooks-via-phx-hook) to handle user interactions.

We could try to use the [Phoenix.LiveView.JS](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.JS.html) module directly but we want to have full control over the select component behavior and user interactions like keyboard navigation.

To be flexible, a Select component typically uses two html inputs:
- one hidden input to store the selected option's value,
- one text input to display the selected option's text or the search query.

For our countries, each option will look like this:

```elixir
%{value: "FR", text: "France"}
```

Here, the `.value` field is the actual value to use in our `.simple_form`, and the `.text` is the text to display in the input and the options list menu.

You can create a new file, `lib/phoenix_liveview_select_web/live/components/select.ex` and add the following code:

```elixir
defmodule PhoenixLiveviewSelectWeb.Live.Components.Select do
  use PhoenixLiveviewSelectWeb, :live_component

  @impl true
  def render(assigns) do
    ~H"""
    <div phx-feedback-for={@name} phx-hook="Select" id={@id}>
      <.label for={@id}><%= @label %></.label>

      <div class="relative">
        <div class="relative">
          <input
            type="hidden"
            id={@id <> "_value_input"}
            name={@name}
            value={if @selected, do: @selected.id}
          />

          <input
            form="disabled"
            id={@id <> "_input"}
            type="text"
            autocomplete="off"
            value={if @selected, do: @selected.name}
            class={[
              "mt-2 block w-full rounded-lg text-zinc-900 focus:ring-0 sm:text-sm sm:leading-6",
              "phx-no-feedback:border-zinc-300 phx-no-feedback:focus:border-zinc-400",
              @errors == [] && "border-zinc-300 focus:border-zinc-400",
              @errors != [] && "border-rose-400 focus:border-rose-400"
            ]}
          />

          <div id={@id <> "_loader"} class="absolute right-2 top-0 bottom-0 flex items-center hidden">
            <.icon name="hero-arrow-path" class="block h-4 w-4 animate-spin text-gray-600" />
          </div>
        </div>

        <div
          id={@id <> "_select"}
          class="absolute w-full top-[100%] border border-zinc-300 rounded shadow-md my-2 bg-white hidden"
        >
          <div class="relative max-h-[200px] overflow-y-auto py-1">
            <%= if Enum.empty?(@options) do %>
              <p class="p-2 text-sm">No results</p>
            <% else %>
              <%= for option <- @options do %>
                <div
                  class="p-1 cursor-default hover:bg-gray-200 text-sm flex items-center"
                  data-id={option.id}
                  data-text={option.text}
                >
                  <%!-- <img src={option.avatar_url} alt={option.text} class="w-5 h-5 mr-1" /> --%>
                  <%= render_slot(@option, option) %>
                </div>
              <% end %>
            <% end %>
          </div>
        </div>
      </div>

      <.error :for={msg <- @errors}><%= msg %></.error>
    </div>
    """
  end

  @impl true
  def update(assigns, socket) do
    %{field: field} = assigns

    socket =
      socket
      |> assign(assigns)
      |> assign(field: nil, id: assigns.id || field.id)
      |> assign(:errors, Enum.map(field.errors, &translate_error(&1)))
      |> assign_new(:name, fn -> field.name end)
      |> assign_new(:value, fn -> field.value end)

    selected = Enum.find(socket.assigns.options, &(&1.id == field.value))
    socket = assign(socket, :selected, selected)

    {:ok, socket}
  end
end
```

This component takes the following assigns:
- `name`: the input name,
- `label`: the input label,
- `options`: the list of options to display,
- `option`: the slot to render each option,
- `field`: the form field to bind the input value,
- `errors`: the list of errors to display.

The options list will contain elements like this:

```elixir
%{id: "FR", text: "France"}
```

We add `id` attributes to both inputs and the select menu to be able to target them in our JS Hook.

We can already add this component to our `EmployeeLive.Index` liveview. Update the render method using `.live_component` to render our select component:

```elixir
def render(assigns) do
  ~H"""
  <.header>Create Employee</.header>

  <.simple_form for={@form} id="employee-form" phx-change="validate" phx-submit="save">
    <.input name="name" label="Name" field={@form[:name]} />

    <.live_component
      field={@form[:country]}
      id={@form[:country].id}
      module={Select}
      label="Country"
      options={@countries_options}
    >
      <:option :let={country}>
        <img src={Countries.country_image(country)} class="w-6 h-6 mx-2" />
        <%= country.text %>
      </:option>
    </.live_component>

    <.button type="submit">Save</.button>
  </.simple_form>
  """
end
```

We pass the `@countries_options` assigns to the select component. This list will be generated in the `mount/3` callback using `update_countries_options/2` function.

```elixir
def mount(_params, _session, socket) do
  socket =
    socket
    |> assign(form: to_form(%{}))
    |> update_countries_options()

  {:ok, socket}
end

defp update_countries_options(socket, query \\ "") do
  options =
    PhoenixLiveviewSelect.Countries.search_contries(query)
    |> Enum.map(fn country ->
      Map.merge(country, %{id: country.code, text: country.name})
    end)

  assign(socket, countries_options: options)
end
```

The `update_countries_options/2` function will be used to filter the countries list based on the search query and prepare the options list to be passed to the select component.

We call this function in `mount/3` to initialize the options list. We will also call it later to update the options list based on the user's search query.

You can now start your Phoenix application and see the select component. For the moment, the select component is not interactive: you can't open it or select an option. We will add the JS part in the next step.

## Step 4: The JS Hook: user interactions

[JS Hooks](https://hexdocs.pm/phoenix_live_view/js-interop.html#client-hooks-via-phx-hook) are a feature of Phoenix LiveView that allows you to write custom JavaScript code to create fully interactive components. Of course, you could also use LiveView to make a component interactive, but in some cases, you don't want to have a network overhead on each user interaction. This is the case with a Select component: you don't want to send a request to the server each time the user opens the select or use the keyboard to navigate options.

You can create a new JS Hook in the `assets/js/app.js` file:

```javascript
let Hooks = {}

Hooks.Select = {
  mounted() {
    console.log("Mounted on", this.el)
  }
}

let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken}, hooks: Hooks})
```

This hook is very simple for now. We just log a message when the hook is mounted. You can now add the `phx-hook="Select"` attribute to the select component in the `lib/phoenix_liveview_select_web/live/components/select.ex` file:

```elixir
<div phx-feedback-for={@name} phx-hook="Select" id={@id}>
```

Be sure to add `phx-hook="Select"` to the top level div of the select component.

In your browser, you should now see the message "Mounted on" in the console. This means that the hook is correctly mounted on the select component.

### Opening and closing the select menu

The first thing we want to do is to open the select menu when the user clicks on the input. We can add an event listener to the input in the `mounted` function:

```javascript
Hooks.Select = {
  mounted() {
    // Target the required dom elements
    this.selectMenu = this.el.querySelector(`#${this.el.id}_select`)
    this.textInput = this.el.querySelector(`#${this.el.id}_input`)

    // Initialize internal state
    this.isOpen = false

    // State transformation functions
    this.close = () => {
      this.isOpen = false
      this.selectMenu.classList.add("hidden")
    }

    this.open = () => {
      this.isOpen = true
      this.selectMenu.classList.remove("hidden")
    }

    // Event listeners
    this.textInput.addEventListener("focus", this.open)

    this.textInput.addEventListener("blur", this.close)
  },
}
```

Here is what we did:
- We target the select menu and the text input using the `querySelector` method on our root element: `this.el`,
- We initialize an internal state `isOpen` to keep track of the select menu state (we'll need this later),
- We define two functions `open` and `close` to open and close the select menu and update the `isOpen` state,
- We add event listeners to the text input to open the select menu when the input is focused and close it when the input is blurred.

Here we use the focus and blur events to not only open or close the menu when the user click the input but also when the user focuses the input using tab. The blur event will be triggered when the user focuses another element: clicking outside our input or pressing tab.

Now, you should be able to open or close your component by clicking on the input.

We can already implement basic keyboard navigation. To keep things organized in your `mounted` function, you should insert the next code snippets in the corresponding sections (initialize internal state, state transformation functions, event listeners).

### Keyboard navigation

To add keyboard navigation, we need to store the active option index and update it when the user uses the arrow keys. We can add the following code to the `mounted` function:

```javascript
// Initialize internal state
// ...
this.activeOptionIndex = -1

// State transformation functions
// ...
this.setActiveElementIndex = (index) => {
  const optionElements = this.selectMenu.querySelectorAll("[data-id]")

  if (optionElements[this.activeOptionIndex]) (
    optionElements[this.activeOptionIndex].classList.remove("bg-gray-200")
  )

  if (index < 0) {
    this.activeOptionIndex = optionElements.length - 1
  } else if (index >= optionElements.length) {
    this.activeOptionIndex = 0
  } else {
    this.activeOptionIndex = index
  }
  optionElements[this.activeOptionIndex].classList.add("bg-gray-200")
}

// Event listeners
// ...
this.textInput.addEventListener("keydown", (e) => {
  e.stopPropagation()

  if (e.key === "Escape") {
    this.close()
  } else if (e.key === "ArrowDown") {
    this.setActiveElementIndex(this.activeOptionIndex + 1)
  } else if (e.key === "ArrowUp") {
    this.setActiveElementIndex(this.activeOptionIndex - 1)
  } else if (e.key === "Enter" && this.isOpen) {
    if (this.activeOptionIndex >= 0) {
      const activeOption = this.selectMenu.querySelectorAll("[data-id]")[this.activeOptionIndex]
      this.onItemSelect({ target: activeOption })
    }
  } else if (!this.isOpen) {
    this.open()
  }
})
```

Great, so we have a basic keyboard navigation system. When the user presses the arrow keys, we update the active option index and highlight the corresponding option. We also close the select menu when the user presses the escape key.

### Selecting an option

Now we need to select the active option when the user presses the enter key or click an option.

We can add the following code to the `mounted` function:

```javascript
// Initialize internal state
// ...
this.selected = {value: this.valueInput.value, text: this.textInput.value}

// State transformation functions
// ...
this.onItemSelect = (e) => {
  // Get value and text from data-* attributes
  this.selected = {value: e.target.dataset.id, text: e.target.dataset.text}

  // Display the selected option in the input
  this.textInput.value = this.selected.text

  // Update the hidden input value and dispatch a change event
  this.valueInput.value = this.selected.value
  this.valueInput.dispatchEvent(new Event("change", { bubbles: true }))

  this.close()
}

// Event listeners
// ...
this.selectMenu.querySelectorAll("[data-id]").forEach((option) => {
  option.addEventListener("mousedown", this.onItemSelect)
})
```

Here is what we did:
- We initialize the `selected` state with the value and text of the selected option,
- We define an `onItemSelect` function to update the selected option when the user select an option (this function is already called when the user presses the enter key),
- We add an event listener to each option in the select menu to call the `onItemSelect` function when the user clicks an option.

The `onItemSelect` function will update the selected option, close the select menu and dispatch a change event on the hidden input to notify the LiveView that the value has changed. Here we follow the [Phoenix LiveView documentation](https://hexdocs.pm/phoenix_live_view/form-bindings.html#triggering-phx-form-events-with-javascript) to trigger the change event on the hidden input.

You should now be able to select an option using the keyboard or the mouse. The selected option will be displayed in the input and your LiveView form will be updated:
1. The change event is triggered on the hidden input,
2. The Phoenix form receives the new value and trigger the "validate" event,
3. Your LiveView form assign is updated with the new value in the `handle_event` we implemented earlier:

```elixir
@impl true
def handle_event("validate", employee_params, socket) do
  socket =
    socket
    |> assign(form: to_form(employee_params))

  {:noreply, socket}
end
```

4. The Select live component is re-rendered,
5. The JS Hook's `updated` method is called (we don't have one yet).

Great! Now we can implement our autocomplete feature.

### Make it searchable

To have a searchable select, we need to update the options list based on the user's search query. We can add a new event listener to the text input that will push an "autocomplete" event to the LiveView when the user types in the input. The LiveView will then update the options list based on the search query which will trigger a re-render of the Select component.

Our LiveView could have multiple Select components so we need to differentiate the event source. The LiveView could pass an event name to the Select component that will be used to push the event to the LiveView.

In your LiveView, you can add this assign to the select component:

```elixir
<.live_component
  # ...
  autocomplete="autocomplete_countries"
>
```

And we can pass this assign to the JS Hook by adding the following attribute to the Select component root element:

```elixir
<div phx-feedback-for={@name} phx-hook="Select" autocomplete={@autocomplete} id={@id}>
```

Now we can add the following code to the `mounted` function of our JS Hook:

```javascript
// Event listeners
// ...
this.textInput.addEventListener("input", (e) => {
  this.pushEvent(this.el.getAttribute("autocomplete"), { query: this.textInput.value })
})
```

And we can handle this event in our LiveView with a new handle_event:

```elixir
def handle_event("autocomplete_countries", %{"query" => query}, socket) do
  {:noreply, update_countries_options(socket, query)}
end
```

Now, when the user types in the input, the LiveView will update the options list based on the search query and re-render the Select component. But we have some issues here with the re-rendering: the select menu is closed when the options list is updated.

We will fix this issues in the next section!

### Re-rendering caveats

To fix the re-rendering issues, we need to add a new `updated` function to our JS Hook:

```javascript
Hooks.Select = {
  mounted() {
    // ...
  },
  updated() {
    if (this.isOpen) {
      this.selectMenu.classList.remove("hidden")
    } else {
      this.selectMenu.classList.add("hidden")
    }

    this.valueInput.value = this.selected.value

    this.selectMenu.querySelectorAll("[data-id]").forEach((option) => {
      option.addEventListener("mousedown", this.onItemSelect)
    })
  }
}
```

This function ensure our dom is synced with the internal state of our component.

We fix 3 issues here:
- We keep the select menu open,
- We update the hidden input value with the selected option value. We need this because Phoenix won't erase the value of an input as described in the [documentation](https://hexdocs.pm/phoenix_live_view/form-bindings.html#javascript-client-specifics),
- We add the event listeners to the newly created options: when we search for a country, the options list is updated and we need to add the event listeners to the new options.

## Conclusion

Perfect! We have a fully functional select component. You can now search for a country, select an option using the keyboard or the mouse, and the selected option will be displayed in the input and your LiveView form will be updated.

In this post we explored many areas of Phoenix LiveView development:
- We built a new LiveView and a Phoenix Form,
- We built a custom select component using a LiveComponent,
- We used a JS Hook to handle user interactions,
- We used events to communicate between the JS Hook and the LiveView,
- We used the `updated` function to keep our component in sync with the dom.

Thanks for reading! I hope you enjoyed this post! Feel free to explore my other [posts](/posts/) and [projects](/) on this website.

If you have any questions or feedback, feel free to reach out at [aurmartin@pm.me](mailto:aurmartin@pm.me).
