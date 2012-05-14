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
import logging
import config


def doCall(theCall):
        logging.debug('Performing a call')
        username = config.pool_user
        pw = config.pool_password

        encoded = base64.b64encode(username + ':' + pw)
        authstr = "Basic "+encoded
                
        result = urlfetch.fetch(url=config.pool_server,
                        payload=theCall,
                        method=urlfetch.POST,
                        headers={ 'Authorization':authstr}
                        )
        return result
        

class MainHandler(webapp.RequestHandler):
    def get(self):
        self.response.out.write('Jilaku!')


class SubmitWork(webapp.RequestHandler):
    def get(self):
        self.response.out.write('Jilaku!')
    
    def post(self):
        logging.info('Submit Work')
        golden_ticket = self.request.get("golden_ticket")
        logging.debug('Ticket: '.join(golden_ticket))
        
        submitworkCall = { "id":"1", "method":"getwork", "params":{"golden_ticket":golden_ticket} }
        
        
        result = doCall(submitworkCall)

        
        logging.debug('return from submitwork: '.join(result.content))
                
        self.response.out.write(result.content)


class GetWork(webapp.RequestHandler):
    def get(self):
        
        logging.info('Get Work')
                
        getworkCall = '{ "id":"1", "method":"getwork", "params":[] }'
        
        result = doCall(getworkCall)

        logging.debug('Result from getwork: '.join(result.content))
                
        self.response.out.write(result.content)



def main():
    application = webapp.WSGIApplication([('/', MainHandler),
                                          ('/getwork/', GetWork),
                                          ('/submitwork/', SubmitWork) ],
                                         debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
