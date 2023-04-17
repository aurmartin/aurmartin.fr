const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy({ "input/robots.txt": "/robots.txt" });
  eleventyConfig.addPassthroughCopy({ "input/_includes/images": "/images" });

  return {
    dir: {
      input: "input",
    },
  };
};
