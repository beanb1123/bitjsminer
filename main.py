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
        
        #form_data = urllib.urlencode(form_fields)
        result = urlfetch.fetch(url='http://pool.bitlc.net:8332',
                        payload=submitworkCall,
                        method=urlfetch.POST,
                        headers={ 'Authorization':authstr}
                        )

                
        #self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(result.content)
        #self.response.out.write('{"id":"1","error":null,"result":{"midstate":"afb28c2f8db3c5348c5e53fa884f2033656d9140494ee6a66a9bb352878fd7e2","target":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000","data":"00000001e6723b861ef2b3d5664289b28486e20467545eb51cc1194000000024000000003e9022ac4837223c3cbdec1806e9ae2eee41baae025d5b33640ff339e04d25b44ede284d1a0f61b100000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000","hash1":"00000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000010000"}}')


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
        
        #form_data = urllib.urlencode(form_fields)
        result = urlfetch.fetch(url='http://pool.bitlc.net:8332',
                        payload=getworkCall,
                        method=urlfetch.POST,
                        headers={ 'Authorization':authstr}
                        )

                
        #self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(result.content)
        #self.response.out.write('{"id":"1","error":null,"result":{"midstate":"afb28c2f8db3c5348c5e53fa884f2033656d9140494ee6a66a9bb352878fd7e2","target":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000","data":"00000001e6723b861ef2b3d5664289b28486e20467545eb51cc1194000000024000000003e9022ac4837223c3cbdec1806e9ae2eee41baae025d5b33640ff339e04d25b44ede284d1a0f61b100000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000","hash1":"00000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000010000"}}')



def main():
    application = webapp.WSGIApplication([('/', MainHandler),
                                          ('/getwork/', GetWork),
                                          ('/submitwork/', SubmitWork) ],
                                         debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
