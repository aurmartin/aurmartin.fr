---
title: "(draft) Buidling a Select component using Phoenix LiveView"
description: "In this post, we will build a Select component using Phoenix LiveView."
date: 2024-03-19
layout: post
tags: posts
keywords: phoenix, liveview, select, component, elixir, erlang, web, development, programming, software, engineering, javascript, html, css, frontend, backend, fullstack, web, developer, web, engineer, react, nodejs, postgresql
---

## Introduction

In this post, we will explore how to build a select input component using Phoenix LiveView. There are already a couple of articles on the web about this but none of them fitted my needs. I wanted to build a select component that you can plug in a LiveView form to replace a classic select input.

Here are the features I wanted to implement:
- Custom option item rendering (including images),
- Auto-complete,
- Compatible with Phoenix forms,
- Keyboard navigation.

To use our component, we will build a simple form to create a new employee object. The form will have a select field to choose the employee's country. We will use a sample list of countries as the select options.

Here is the final result we want to achieve:

<img src="{{ '/images/phoenix-liveview-select/final-result.png' | url }}" style="max-width: 100%;" />

I will cover every steps to build this component from scratch, starting from a newly generated Phoenix LiveView project. We will be using Phoenix LiveView 1.7 with TailwindCSS.

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
- We also implements the `country_image/1` function to get the flag image of a country. We will use this image in our select.

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

For the moment we only have the name input field. We will add our select componenet later. You can then add this liveview to your router in the `lib/phoenix_liveview_select_web/router.ex` file:

```elixir
scope "/", PhoenixLiveviewSelectWeb do
  pipe_through :browser

  live "/", EmployeeLive.Index, :index
end
```

You should be able to start your Phoenix application using `mix phx.server` and access the form at `http://localhost:4000`.

## Step 3: Building the select component

Now that we have our `EmployeeLive.Index` liveview with a `.simple_form` working properly, we can start building our select component.

Our component will be composed of a [LiveComponent](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveComponent.html) and a custom [JS Hook](https://hexdocs.pm/phoenix_live_view/js-interop.html#client-hooks-via-phx-hook) to handle user interactions.

We could try to use the [Phoenix.LiveView.JS](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.JS.html) module directly but we want to have full control over the select component behavior and user interactions like keyboard navigation.

To be flexible, a Select component typically uses two html inputs:
- one hidden input to store the selected option's value,
- one text input to display the selected option's text or the search query.

For our coutries, each option will look like this:

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

The options list will contains elements like this:

```elixir
%{id: "FR", text: "France"}
```

We add `id` attributes to both inputs and the select menu to be able to target them in our JS Hook.
