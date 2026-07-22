# 旧版移动端 rem 适配（lib-flexible 思路）

> 📦 **归档原因**：这是早期按视口宽度动态设置根字号、配合 DPR 和 0.5px
> hairline 的移动端适配方案。现代项目通常优先使用响应式布局、`rem`/`vw`、
> 媒体查询、容器查询和标准 viewport；`user-scalable=no` 还会损害可访问性。
> 代码仅用于理解历史项目，不建议新项目直接复制。

```html
<meta
	name="viewport"
	content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
/>

<script>
	(function flexible(window, document) {
		var docEl = document.documentElement;
		var dpr = window.devicePixelRatio || 1;

		// adjust body font size
		function setBodyFontSize() {
			if (document.body) {
				document.body.style.fontSize = 12 * dpr + 'px';
			} else {
				document.addEventListener('DOMContentLoaded', setBodyFontSize);
			}
		}
		setBodyFontSize();

		// set 1rem = viewWidth / 10
		function setRemUnit() {
			var rem = docEl.clientWidth / 10;
			docEl.style.fontSize = rem + 'px';
		}

		setRemUnit();

		// reset rem unit on page resize
		window.addEventListener('resize', setRemUnit);
		window.addEventListener('pageshow', function (e) {
			if (e.persisted) {
				setRemUnit();
			}
		});

		// detect 0.5px supports
		if (dpr >= 2) {
			var fakeBody = document.createElement('body');
			var testElement = document.createElement('div');
			testElement.style.border = '.5px solid transparent';
			fakeBody.appendChild(testElement);
			docEl.appendChild(fakeBody);
			if (testElement.offsetHeight === 1) {
				docEl.classList.add('hairlines');
			}
			docEl.removeChild(fakeBody);
		}
	})(window, document);
</script>
```
