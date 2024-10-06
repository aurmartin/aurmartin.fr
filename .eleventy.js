import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

export default function (eleventyConfig) {
  eleventyConfig.addBundle("css");

  eleventyConfig.addPlugin(syntaxHighlight);  
  eleventyConfig.addPassthroughCopy({ "input/robots.txt": "/robots.txt" });
  eleventyConfig.addPassthroughCopy({ "input/_includes/images": "/images" });
  eleventyConfig.addPassthroughCopy({ "input/_includes/fonts": "/fonts" });

  return {
    dir: {
      input: "input",
    },
  };
};
