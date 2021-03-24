# h5离线缓存manifest

1. 给 `html` 便签添加 `manifest` 属性

```html
<!doctype html>
<html lang="en" manifest="cache.manifest">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>Document</title>
</head>
<body>

</body>
</html>
```

2. 新建 `cache.manifest` 文件

文件由三个部分组成：

- CACHE：需要离线存储的资源列表
- NETWORK：该目录下的资源只能通过在线访问，不会被离线。

> 在 CACHE 和 NETWORK 中有一个相同资源，CACHE 优先级更高

- FALLBACK：访问第一个资源失败后，就会使用第二个资源来替代他

```
CACHE MANIFEST
#v0.11

CACHE:

NETWORK:

FALLBACK:
```

