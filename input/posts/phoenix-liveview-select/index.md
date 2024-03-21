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

![Phoenix LiveView Select](final-result.png)

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

```bash
mix phx.gen.live Employees Employee employees name:string country:string
```
