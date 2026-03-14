$ python -c "from app import create_app; app = create_app(); c = app.test_client(); r = c.post('/api/predictions/create', json={'title':'test'}); print(r.status_code, r.get_json())"
Traceback (most recent call last):
File "<string>", line 1, in <module>
File "/usr/local/lib/python3.11/site-packages/flask/app.py", line 950, in test_client
return cls(  # type: ignore
^^^^^^^^^^^^^^^^^^^^
File "/usr/local/lib/python3.11/site-packages/flask/testing.py", line 118, in __init__
"HTTP_USER_AGENT": f"werkzeug/{werkzeug.__version__}",
^^^^^^^^^^^^^^^^^^^^
AttributeError: module 'werkzeug' has no attribute '__version__'
$ 