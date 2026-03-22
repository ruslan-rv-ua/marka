# Image Test

This file contains various types of images for testing the markdown viewer.

## External Images

### GitHub Logo
![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

### Rust Logo
![Rust Logo](https://www.rust-lang.org/static/images/rust-logo-blk.svg)

## Internal Images

### Test Image 1 (red rectangle)
![Test Image 1](test-image1.png)

### Test Image 2 (blue rectangle)
![Test Image 2](test-image2.png)

### Test Image 3 (green rectangle)
![Test Image 3](test-image3.png)

## Mixed Links and Images

Here you can see a combination of images and links:

1. External image:
![GitHub Logo](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

2. Internal image:
![Test Image 1](test-image1.png)

3. Links to other files:
- [See test-links.md](test-links.md)
- [See test-mixed.md](test-mixed.md)

## Image Gallery

### Internal Images
| Image 1 | Image 2 | Image 3 |
|---------|---------|---------|
| ![Test Image 1](test-image1.png) | ![Test Image 2](test-image2.png) | ![Test Image 3](test-image3.png) |

## Video and Audio (fixMediaSrc test)

Ці медіафайли не існують на диску. Мета — перевірити що `fixMediaSrc()` перетворює відносні шляхи `src` на `tauri://` URI через `convertFileSrc()`.

**Як перевірити:** відкрийте DevTools (F12) після відкриття цього файлу. Знайдіть елементи `<video>` і `<audio>` у DOM → вкладка Elements. Атрибут `src` має бути `tauri://localhost/...` — а не оригінальний `./sample.*` шлях.

### Video (атрибут src)

<video src="./sample.mp4" controls width="400">
  Відео не підтримується вашим браузером.
</video>

### Audio (атрибут src)

<audio src="./sample.mp3" controls>
  Аудіо не підтримується вашим браузером.
</audio>

### Video з вкладеним елементом source

<video controls width="400">
  <source src="./sample.webm" type="video/webm">
  Відео не підтримується вашим браузером.
</video>

## End of Test
This is the end of the image test file.
