import { readFileSync, writeFileSync } from 'fs';
import { minify } from 'terser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build() {
  try {
    const input = readFileSync(join(__dirname, 'tracker.js'), 'utf8');
    
    const result = await minify(input, {
      compress: {
        drop_console: true,
        dead_code: true,
        unused: true,
        join_vars: true,
        warnings: false
      },
      mangle: {
        toplevel: true,
        reserved: ['mm']
      },
      output: {
        comments: false,
        semicolons: false
      }
    });
    
    const output = result.code;
    const size = Buffer.byteLength(output, 'utf8');
    
    writeFileSync(join(__dirname, 'tracker.min.js'), output);
    
    console.log('✓ Tracker built successfully');
    console.log(`  Size: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
    
    if (size > 2048) {
      console.warn('⚠ Warning: Tracker size exceeds 2KB target');
    }
    
    const snippet = `<!-- Minimal Metrics -->
<script async defer data-host="${process.env.MM_HOST || 'https://your-domain.com'}" src="${process.env.MM_HOST || 'https://your-domain.com'}/tracker.min.js"></script>`;
    
    writeFileSync(join(__dirname, 'snippet.html'), snippet);
    console.log('✓ Snippet saved to tracker/snippet.html');
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();