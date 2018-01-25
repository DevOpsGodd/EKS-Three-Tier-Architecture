(function(angular) {
    'use strict';

    var robotshop = angular.module('robotshop', ['ngRoute'])

    // Share user between controllers
    robotshop.factory('currentUser', function() {
        var data = {
            uniqueid: '',
            user: {},
            cart: {
                total: 0
            }
        };

        return data;
    });

    robotshop.config(['$routeProvider', '$locationProvider', ($routeProvider, $locationProvider) => {
        $routeProvider.when('/', {
            templateUrl: 'splash.html',
            controller: 'shopform'
        }).when('/product/:sku', {
            templateUrl: 'product.html',
            controller: 'productform'
        }).when('/login', {
            templateUrl: 'login.html',
            controller: 'loginform'
        }).when('/cart', {
            templateUrl: 'cart.html',
            controller: 'cartform'
        }).when('/shipping', {
            templateUrl: 'shipping.html',
            controller: 'shipform'
        }).when('/payment', {
            templateUrl: 'payment.html',
            controller: 'paymentform'
        });

        // needed for URL rewrite hash
        $locationProvider.html5Mode(true);
    }]);

    // clear template fragment cache
    robotshop.run(function($rootScope, $templateCache) {
        $rootScope.$on('$viewContentLoaded', function() {
            console.log('>>> clearing cache');
            $templateCache.removeAll();
        });
    });

    robotshop.controller('shopform', function($scope, $http, currentUser) {
        $scope.data = {};

        $scope.data.uniqueid = 'foo';
        $scope.data.categories = [];
        $scope.data.products = {};
        // empty cart
        $scope.data.cart = {
            total: 0
        };

        $scope.getProducts = function(category) {
            if($scope.data.products[category]) {
                $scope.data.products[category] = null;
            } else {
                $http({
                    url: '/api/catalogue/products/' + category,
                    method: 'GET'
                }).then((res) => {
                    $scope.data.products[category] = res.data;
                }).catch((e) => {
                    console.log('ERROR', e);
                });
            }
        };

        function getCategories() {
            $http({
                url: '/api/catalogue/categories',
                method: 'GET'
            }).then((res) => {
                $scope.data.categories = res.data;
                console.log('categories loaded');
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }

        // unique id for cart etc
        function getUniqueid() {
            return new Promise((resolve, reject) => {
            $http({
                url: '/api/user/uniqueid',
                method: 'GET'
            }).then((res) => {
                resolve(res.data.uuid);
            }).catch((e) => {
                console.log('ERROR', e);
                reject(e);
            });
        });
        }

        // init
        console.log('shopform starting...');
        getCategories();
        if(!currentUser.uniqueid) {
            console.log('generating uniqueid');
            getUniqueid().then((id) => {
                $scope.data.uniqueid = id;
                currentUser.uniqueid = id;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }
        
        // watch for login
        $scope.$watch(() => { return currentUser.uniqueid; }, (newVal, oldVal) => {
            if(newVal !== oldVal) {
                $scope.data.uniqueid = currentUser.uniqueid;
            }
        });

        // watch for cart changes
        $scope.$watch(() => { return currentUser.cart.total; }, (newVal, oldVal) => {
            if(newVal !== oldVal) {
                $scope.data.cart = currentUser.cart;
            }
        });
    });

    robotshop.controller('productform', function($scope, $http, $routeParams, $timeout, currentUser) {
        $scope.data = {};
        $scope.data.message = ' ';
        $scope.data.product = {};
        $scope.data.quantity = 1;

        $scope.addToCart = function() {
            var url = '/api/cart/add/' + currentUser.uniqueid + '/' + $scope.data.product.sku + '/' + $scope.data.quantity;
            console.log('addToCart', url);
            $http({
                url: url,
                method: 'GET'
            }).then((res) => {
                console.log('cart', res.data);
                currentUser.cart = res.data;
                $scope.data.message = 'Added to cart';
                $timeout(clearMessage, 3000);
            }).catch((e) => {
                console.log('ERROR', e);
                $scope.data.message = 'ERROR ' + e;
                $timeout(clearMessage, 3000);
            });
        };

        function loadProduct(sku) {
            $http({
                url: '/api/catalogue/product/' + sku,
                method: 'GET'
            }).then((res) => {
                $scope.data.product = res.data;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }

        function clearMessage() {
            console.log('clear message');
            $scope.data.message = ' ';
        }
        
        loadProduct($routeParams.sku);
    });

    robotshop.controller('cartform', function($scope, $http, $location, currentUser) {
        $scope.data = {};
        $scope.data.cart = {};
        $scope.data.cart.total = 0;
        $scope.data.uniqueid = currentUser.uniqueid;

        $scope.buy = function() {
            $location.url('/shipping');
        };
        
        $scope.change = function(sku, qty) {
            // update the cart
            var url = '/api/cart/update/' + $scope.data.uniqueid + '/' + sku + '/' + qty;
            console.log('change', url);
            $http({
                url: url,
                method: 'GET'
            }).then((res) => {
                $scope.data.cart = res.data;
                currentUser.cart = res.data;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        };

        function loadCart(id) {
            $http({
                url: '/api/cart/cart/' + id,
                method: 'GET'
            }).then((res) => {
                $scope.data.cart = res.data;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }

        loadCart($scope.data.uniqueid);
    });

    robotshop.controller('shipform', function($scope, $http, $location, currentUser) {
        $scope.data = {};
        $scope.data.countries = [];
        $scope.data.selectedCountry = '';
        $scope.data.selectedLocation = '';
        $scope.data.disableCity = true;
        $scope.data.disableCalc = true;
        $scope.data.shipping = '';

        $scope.calcShipping = function() {
            console.log('calc uuid', uuid);
            $http({
                url: '/api/shipping/calc/' + uuid,
                method: 'GET'
            }).then((res) => {
                console.log('shipping data', res.data);
                $scope.data.shipping = res.data;
                $scope.data.shipping.location = $scope.data.selectedCountry.name + ' ' + autoLocation;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        };

        $scope.confirmShipping = function() {
            console.log('shipping confirmed');
            $http({
                url: '/api/shipping/confirm/' + currentUser.uniqueid,
                method: 'POST',
                data: $scope.data.shipping
            }).then((res) => {
                // go to final confirmation
                console.log('confirm cart', res.data);
                // save new cart
                currentUser.cart = res.data;
                $location.url('/payment');
            }).catch((e) => {
                console.log('ERROR', e);
            });
        };

        $scope.countryChanged = function() {
            console.log('selected', $scope.data.selectedCountry);
            if($scope.data.selectedCountry) {
                $scope.data.disableCity = false;
            }
            $scope.data.selectedLocation = '';
            $scope.data.disableCalc = true;
            $scope.data.shipping = '';
        };

        // auto-complete
        var autoLocation;
        var uuid;

        function loadCodes() {
            $http({
                url: '/api/shipping/codes',
                method: 'GET'
            }).then((res) => {
                $scope.data.countries = res.data;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }
        
        function buildauto() {
            autoLocation = new autoComplete({
                selector: 'input[id=location]',
                source: (term, suggest) => {
                    console.log('autocomplete', term);
                    $scope.data.disableCalc = true;
                    $http({
                        url: '/api/shipping/match/' + $scope.data.selectedCountry.code + '/' + term,
                        method: 'GET'
                    }).then((res) => {
                        console.log('suggest', res.data);
                        suggest(res.data);
                    }).catch((e) => {
                        console.log('ERROR', e);
                    });
                },
                renderItem: (item, search) => {
                    console.log('render', item, search);
                    return '<div class="autocomplete-suggestion" loc-uuid="' + item.uuid + '" data-val="' + item.name + '">' + item.name + '</div>';
                },
                onSelect: (e, term, item) => {
                    console.log('select', term, item);
                    uuid = item.getAttribute('loc-uuid');
                    autoLocation = item.getAttribute('data-val');
                    $scope.data.disableCalc = false;
                    $scope.data.shipping = '';
                    // synchronise angular
                    $scope.$apply();
                }
            });
        }

        console.log('shipform init');
        loadCodes();
        buildauto();
    });

    robotshop.controller('paymentform', function($scope, $http, currentUser) {
        $scope.data = {};
        $scope.data.uniqueid = currentUser.uniqueid;
        $scope.data.cart = currentUser.cart;

        $scope.pay = function() {
        };

        console.log('paymentform init');
    });

    robotshop.controller('loginform', function($scope, $http, currentUser) {
        $scope.data = {};
        $scope.data.name = '';
        $scope.data.email = '';
        $scope.data.password = '';
        $scope.data.password2 = '';
        $scope.data.message = '';
        $scope.data.user = {};

        $scope.login = function() {
            $scope.data.message = '';
            $http({
                url: '/api/user/login',
                method: 'POST',
                data: {
                    name: $scope.data.name,
                    password: $scope.data.password,
                    email: $scope.data.email
                }
            }).then((res) => {
                $scope.data.user = res.data;
                $scope.data.user.password = '';
                $scope.data.password = $scope.data.password2 = '';
                currentUser.user = $scope.data.user;
                currentUser.uniqueid = $scope.data.user.name;
            }).catch((e) => {
                console.log('ERROR', e);
                $scope.data.message = 'ERROR ' + e.data;
                $scope.data.password = '';
            });
        };

        $scope.register = function() {
            $scope.data.message = '';
            $scope.data.name = $scope.data.name.trim();
            $scope.data.email = $scope.data.email.trim();
            $scope.data.password = $scope.data.password.trim();
            $scope.data.password2 = $scope.data.password2.trim();
            // all fields complete
            if($scope.data.name && $scope.data.email && $scope.data.password && $scope.data.password2) {
                if($scope.data.password !== $scope.data.password2) {
                    $scope.data.message = 'Passwords do not match';
                    $scope.data.password = $scope.data.password2 = '';
                    return;
                }
            }
            $http({
                url: '/api/user/register',
                method: 'POST',
                data: {
                    name: $scope.data.name,
                    email: $scope.data.email,
                    password: $scope.data.password
                }
            }).then((res) => {
                $scope.data.user = {
                    name: $scope.data.name,
                    email: $scope.data.email
                };
                $scope.data.password = $scope.data.password2 = '';
                currentUser.user = $scope.data.user;
                currentUser.uniqueid = $scope.data.user.name;
            }).catch((e) => {
                console.log('ERROR', e);
                $scope.data.message = 'ERROR ' + e.data;
                $scope.data.password = $scope.data.password2 = '';
            });
        };

        console.log('loginform init');
        if(!angular.equals(currentUser.user, {})) {
            $scope.data.user = currentUser.user;
        }
    });

}) (window.angular);
