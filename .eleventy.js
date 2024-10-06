import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight"
import markdownIt from "markdown-it"
import markdownItAnchor from "markdown-it-anchor"

export default function (eleventyConfig) {
  eleventyConfig.addBundle("css")

  eleventyConfig.setLibrary(
    "md",
    markdownIt({
      html: true,
      linkify: true,
    }).use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.linkInsideHeader(),
    })
  )

  eleventyConfig.addPlugin(syntaxHighlight)

  eleventyConfig.addPassthroughCopy({ "input/robots.txt": "/robots.txt" })
  eleventyConfig.addPassthroughCopy({ "input/_includes/images": "/images" })
  eleventyConfig.addPassthroughCopy({ "input/_includes/fonts": "/fonts" })

  return {
    dir: {
      input: "input",
    },
  }
}
