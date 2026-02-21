// Sample HTML fixtures for code block extraction tests

export const CODE_BLOCKS_HTML = `
<html>
<body>
<h2>JavaScript Example</h2>
<pre><code class="language-javascript">function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("World"));</code></pre>

<h2>Python Example</h2>
<pre><code class="lang-py">def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))</code></pre>

<h2>Rust Example</h2>
<pre><code class="language-rs">fn main() {
    let x = 5;
    println!("The value of x is: {}", x);
}</code></pre>

<h2>No Language Specified</h2>
<pre><code>some generic code block
with multiple lines
but no language class</code></pre>

<h2>Inline code (should be skipped)</h2>
<p>Use <code>npm install</code> to install dependencies.</p>

<h2>Long inline code (should be extracted)</h2>
<code>This is a long standalone code block that spans multiple lines
and contains enough content to be considered a code block by the extractor
even though it is not wrapped in a pre tag</code>
</body>
</html>
`;

export const PRE_WITHOUT_CODE_HTML = `
<html>
<body>
<pre class="language-bash">
#!/bin/bash
echo "Hello from a pre tag without code child"
ls -la
</pre>
</body>
</html>
`;

export const HIGHLIGHT_SOURCE_HTML = `
<html>
<body>
<pre><code class="highlight-source-go">package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}</code></pre>
</body>
</html>
`;

export const NO_CODE_HTML = `
<html>
<body>
<p>This page has no code blocks at all.</p>
<p>Just regular text content.</p>
</body>
</html>
`;

export const DUPLICATE_CODE_HTML = `
<html>
<body>
<pre><code class="language-js">console.log("duplicate");</code></pre>
<pre><code class="language-javascript">console.log("duplicate");</code></pre>
</body>
</html>
`;
