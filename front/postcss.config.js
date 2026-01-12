// front/postcss.config.js
module.exports = {
  plugins: {
    'postcss-nested': {},
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  }
}