$ python -c "import urllib.request,json;req=urllib.request.Request('http://127.0.0.1:5000/api/predictions/create',data=json.dumps({'title':'t'}).encode(),headers={'Content-Type':'application/json'},method='POST');print(urllib.request.urlopen(req).read())"
Traceback (most recent call last):
File "<string>", line 1, in <module>
File "/usr/local/lib/python3.11/urllib/request.py", line 216, in urlopen
return opener.open(url, data, timeout)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
File "/usr/local/lib/python3.11/urllib/request.py", line 525, in open
response = meth(req, response)
^^^^^^^^^^^^^^^^^^^
File "/usr/local/lib/python3.11/urllib/request.py", line 634, in http_response
response = self.parent.error(
^^^^^^^^^^^^^^^^^^
File "/usr/local/lib/python3.11/urllib/request.py", line 563, in error
return self._call_chain(*args)
^^^^^^^^^^^^^^^^^^^^^^^
File "/usr/local/lib/python3.11/urllib/request.py", line 496, in _call_chain
result = func(*args)
^^^^^^^^^^^
File "/usr/local/lib/python3.11/urllib/request.py", line 643, in http_error_default
raise HTTPError(req.full_url, code, msg, hdrs, fp)
urllib.error.HTTPError: HTTP Error 405: METHOD NOT ALLOWED


$ ls /proc/*/cmdline 2>/dev/null | while read f; do echo "$(dirname $f | xargs basename): $(cat $f | tr '\0' ' ')"; done | grep python
1: python app_unified.py
20: /usr/local/bin/python app_unified.py
cat: /proc/288/cmdline: No such file or directory