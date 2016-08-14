FROM node:argon
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
EXPOSE 1337
EXPOSE 7000
CMD [ "npm", "start" ]
