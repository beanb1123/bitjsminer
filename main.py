#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
import urllib
import base64
from django.utils import simplejson as json
from google.appengine.api import urlfetch


class MainHandler(webapp.RequestHandler):
    def get(self):
        self.response.out.write('Jilaku!')


class SubmitWork(webapp.RequestHandler):
    def get(self):
        self.response.out.write('Jilaku!')
    
    def post(self):

        golden_ticket = self.request.get("golden_ticket")
        
        username = "your_user"
        pw = "your_password"

        encoded = base64.b64encode(username + ':' + pw)
        authstr = "Basic "+encoded

        submitworkCall = '{ "id":"1", "method":"submitwork", "params":[] }'
        
        submittworkPayload = json.dumps(submitworkCall)
        
        result = urlfetch.fetch(url='http://pool.bitlc.net:8332',
                        payload=submitworkCall,
                        method=urlfetch.POST,
                        headers={ 'Authorization':authstr}
                        )

                
        self.response.out.write(result.content)


class GetWork(webapp.RequestHandler):
    def get(self):

        golden_ticket = self.request.get("golden_ticket")
        
        if golden_ticket <> '':
                self.response.out.write(golden_ticket)
                        
        username = "your_user"
        pw = "your_password"

        encoded = base64.b64encode(username + ':' + pw)
        authstr = "Basic "+encoded

        getworkCall = '{ "id":"1", "method":"getwork", "params":[] }'
        
        getworkPayload = json.dumps(getworkCall)
        
        result = urlfetch.fetch(url='http://pool.bitlc.net:8332',
                        payload=getworkCall,
                        method=urlfetch.POST,
                        headers={ 'Authorization':authstr}
                        )

                
        self.response.out.write(result.content)



def main():
    application = webapp.WSGIApplication([('/', MainHandler),
                                          ('/getwork/', GetWork),
                                          ('/submitwork/', SubmitWork) ],
                                         debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
