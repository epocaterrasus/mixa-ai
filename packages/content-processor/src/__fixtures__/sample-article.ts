// Sample HTML fixture simulating a real article page

export const SAMPLE_ARTICLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Understanding TypeScript Generics">
  <meta property="og:image" content="https://example.com/ts-generics.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Dev Blog">
  <meta name="twitter:image" content="https://example.com/ts-generics-twitter.png">
  <title>Understanding TypeScript Generics - Dev Blog</title>
</head>
<body>
  <header>
    <nav><a href="/">Home</a> <a href="/blog">Blog</a></nav>
  </header>
  <article>
    <h1>Understanding TypeScript Generics</h1>
    <p class="byline">By Jane Smith</p>
    <p class="excerpt">A comprehensive guide to TypeScript generics with practical examples for everyday development.</p>
    <div class="article-content">
      <p>TypeScript generics provide a way to create reusable components that work with a variety of types rather than a single one. This allows users to consume these components and use their own types.</p>
      <h2>Why Use Generics?</h2>
      <p>Without generics, we would either have to give the identity function a specific type or use the any type. Using any defeats the purpose of TypeScript's type system. Generics allow us to capture the type the user provides so that we can use that information later.</p>
      <p>Consider a simple function that returns whatever is passed to it. Without generics, we might write it as follows:</p>
      <pre><code class="language-typescript">function identity(arg: any): any {
  return arg;
}</code></pre>
      <p>While using any is certainly generic in that it will cause the function to accept any and all types for the type of arg, we actually are losing the information about what that type was when the function returns.</p>
      <h2>Generic Functions</h2>
      <p>Instead, we need a way of capturing the type of the argument in such a way that we can also use it to denote what is being returned. Here, we will use a type variable, a special kind of variable that works on types rather than values:</p>
      <pre><code class="language-typescript">function identity&lt;T&gt;(arg: T): T {
  return arg;
}

const result = identity&lt;string&gt;("hello");
console.log(result);</code></pre>
      <p>We've now added a type variable T to the identity function. This T allows us to capture the type the user provides, so that we can use that information later. Here, we use T again as the return type.</p>
      <h2>Generic Interfaces</h2>
      <p>We can also create generic interfaces. This is useful when we want to describe the shape of an object that contains type parameters:</p>
      <pre><code class="language-typescript">interface GenericIdentityFn&lt;T&gt; {
  (arg: T): T;
}

const myIdentity: GenericIdentityFn&lt;number&gt; = identity;</code></pre>
      <p>Generics are one of the most powerful features in TypeScript. They enable you to write flexible, reusable code while maintaining full type safety. Whether you're building utility functions, data structures, or entire frameworks, generics are essential.</p>
      <p>In the next article, we'll explore advanced generic patterns including conditional types, mapped types, and template literal types.</p>
    </div>
  </article>
  <footer>
    <p>&copy; 2024 Dev Blog</p>
  </footer>
  <script>console.log("tracking");</script>
  <img src="https://tracker.example.com/pixel.gif" width="1" height="1">
</body>
</html>
`;

export const MINIMAL_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Minimal Page</title></head>
<body><p>Not enough content for article extraction.</p></body>
</html>
`;

export const DANGEROUS_HTML = `
<div>
  <p>Safe content here.</p>
  <script>alert('xss')</script>
  <iframe src="https://evil.com/frame"></iframe>
  <img src="javascript:alert('xss')" alt="bad">
  <img src="https://tracker.com/pixel.gif" width="1" height="1">
  <a href="javascript:void(0)" onclick="steal()">Click me</a>
  <p onmouseover="hack()">Hover text</p>
  <object data="malware.swf"></object>
  <embed src="malware.swf">
  <style>@import url('https://evil.com/steal.css');</style>
  <p>More safe content.</p>
</div>
`;

export const THUMBNAIL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:image" content="/images/hero.png">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="400">
  <title>Page with thumbnail</title>
</head>
<body><p>Content</p></body>
</html>
`;

export const TWITTER_IMAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="twitter:image" content="https://cdn.example.com/card.jpg">
  <title>Page with twitter image</title>
</head>
<body><p>Content</p></body>
</html>
`;

export const LINK_IMAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <link rel="image_src" href="/static/preview.png">
  <title>Page with link image</title>
</head>
<body><p>Content</p></body>
</html>
`;

export const NO_THUMBNAIL_HTML = `
<!DOCTYPE html>
<html>
<head><title>No thumbnail</title></head>
<body><p>Content with no meta images</p></body>
</html>
`;
