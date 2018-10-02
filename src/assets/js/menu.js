/**
 * Created by wutong on 2018/1/4.
 */
shenjian.Menu = function(){}
shenjian.Menu.template = [
    {
        label:i18n.__("menu_file"),
        role:"file",
        submenu:[
            {
                label:i18n.__("menu_file_new"),
                iconfont:"fs-add",
                role:"new"
            },
            {
                type:"separator"
            },
            {
                label:i18n.__("project_import_text"),
                role:"importList",
                enabled:false,
                submenu:[
                    {
                        label:i18n.__("menu_file_import"),
                        role:"import"
                    }
                ]
            },
            {
                label:i18n.__("menu_file_export"),
                role:"export",
                enabled:false
            },
            {
                label:i18n.__("menu_project_settings"),
                role:"project_settings",
                enabled:false
            },
        ]
    },
    {
        label:i18n.__("menu_tool"),
        role:"tool",
        submenu:[
            {
                label:i18n.__("menu_tool_generate"),
                iconfont:"fs-web",
                submenu:[
                    {
                        label:i18n.__("menu_tool_generate_captcha"),
                        role:"captcha"
                    }
                ]
            },
            {
                label:i18n.__("project_load_data"),
                submenu:[
                    {
                        label:i18n.__("project_load_mnist"),
                        role:"loadMnist"
                    }
                ]
            },
        ]
    },
    {
        label:i18n.__("menu_help"),
        role:"help",
        submenu:[
            {
                label:i18n.__("menu_help_visit"),
                iconfont:"fs-web",
                role:"homepage"
            },
            {
                label:i18n.__("menu_help_contact"),
                iconfont:"fs-chat",
                role:"service",
                visible: i18n.__("lang") === 'zh-CN'
            },
            {
                label:i18n.__("menu_help_about"),
                role:"version"
            }
        ]
    },
    {
        label:i18n.__("menu_recommend"),
        role:"recommend",
        submenu:[
            {
                label:i18n.__("menu_recommend_houyi"),
                role:"houyi"
            }
        ]
    }
]
shenjian.Menu.onclick = function(item,focusedWindow,event){
    $("#nav-menu").trigger("menu.shenjian",[item.role]);
}
shenjian.Menu.menuItems = {};
shenjian.Menu.show = function(role){
    var menuItem = shenjian.Menu.menuItems[role];
    if(menuItem){
        if(process.platform == "darwin"){
            menuItem.visible = true;
        }else{
            menuItem.removeClass("hidden")
        }
    }
}
shenjian.Menu.hide = function(role){
    var menuItem = shenjian.Menu.menuItems[role];
    if(menuItem){
        if(process.platform == "darwin"){
            menuItem.visible = false;
        }else{
            menuItem.addClass("hidden")
        }
    }
}
shenjian.Menu.enable = function(role){
    var menuItem = shenjian.Menu.menuItems[role];
    if(menuItem){
        if(process.platform == "darwin"){
            menuItem.enabled = true;
        }else{
            menuItem.removeClass("disabled")
        }
    }
}
shenjian.Menu.disable = function(role){
    var menuItem = shenjian.Menu.menuItems[role];
    if(menuItem){
        if(process.platform == "darwin"){
            menuItem.enabled = false;
        }else{
            menuItem.addClass("disabled")
        }
    }
}
shenjian.Menu.create = function(menus,parent){
    if(typeof menus == "undefined"){
        menus = shenjian.Menu.template;
    }
    if(process.platform == "darwin"){
        //如果是mac 则直接根据mac的格式生成菜单
        const {remote} = require('electron')
        const {Menu, MenuItem} = remote

        for(var menuIndex in menus){
            //顶层
            var topMenu = menus[menuIndex];
            if (topMenu.visible === false) {//删除不显示的顶级菜单，mac不支持隐藏
                delete menus[menuIndex];
            }
            if(topMenu.submenu){
                for(var submenuIndex in topMenu.submenu){
                    //下拉菜单
                    var subMenu = topMenu.submenu[submenuIndex];
                    subMenu.click = shenjian.Menu.onclick;
                    if(subMenu.submenu){
                        for(var leafmenuIndex in subMenu.submenu){
                            //二级菜单
                            var leafMenu = subMenu.submenu[leafmenuIndex];
                            leafMenu.click = shenjian.Menu.onclick;
                        }
                    }
                }
            }
        }
        var fileMenu = menus.shift();
        menus.unshift({
            label: i18n.__("menu_mac_edit"),
            submenu: [
                {
                    label: i18n.__("menu_mac_undo"),
                    role: 'undo'
                },
                {
                    label: i18n.__("menu_mac_redo"),
                    role: 'redo'
                },
                {
                    label: i18n.__("menu_mac_cut"),
                    role: 'cut'
                },
                {
                    label: i18n.__("menu_mac_copy"),
                    role: 'copy'
                },
                {
                    label: i18n.__("menu_mac_paste"),
                    role: 'paste'
                },
                {
                    label: i18n.__("menu_mac_selectall"),
                    role: 'selectall'
                },
            ]
        });
        menus.unshift(fileMenu);
        menus.unshift({
            submenu:[
                {
                    label:i18n.__("menu_mac_hide"),
                    role: 'hide'
                },
                {
                    label:i18n.__("menu_mac_hideOthers"),
                    role: 'hideothers'
                },
                {
                    label:i18n.__("menu_mac_unHide"),
                    role: 'unhide'
                },
                {
                    type: 'separator'
                },
                {
                    label:i18n.__("menu_mac_quit"),
                    role: 'quit'
                }
            ]
        });
        const menu = Menu.buildFromTemplate(menus);

        for(var itemIndex in menu.items){
            var topMenu = menu.items[itemIndex];

            if(topMenu.submenu.items){
                for(var subitemIndex in topMenu.submenu.items){
                    var subMenu = topMenu.submenu.items[subitemIndex];
                    shenjian.Menu.menuItems[subMenu.role] = subMenu;
                }
            }
            shenjian.Menu.menuItems[topMenu.role] = topMenu;
        }

        Menu.setApplicationMenu(menu)
        return;
    }
    if(typeof parent == "undefined"){
        parent = $("#nav-menu");
    }


    for(var i = 0;i<menus.length;i++){
        var menu = menus[i];
        var menuItem = $("<li></li>").appendTo(parent);

        if(menu.role){
            menuItem.data("role",menu.role);
            shenjian.Menu.menuItems[menu.role] = menuItem;
        }
        if(menu.enabled === false){
            menuItem.addClass("disabled");
        }
        if(menu.visible === false){
            menuItem.addClass("hidden");
        }
        if(menu.accelerator){
            menuItem.attr("accelerator",menu.accelerator);
        }
        if(menu.type == "separator"){
            menuItem.addClass("separator");
        }else{
            var menuIcon = $("<i class='icon'></i>").appendTo(menuItem);
            if(menu.iconfont){
                menuIcon.addClass("fs "+menu.iconfont);
            }
            $("<label>"+menu.label+"</label>").appendTo(menuItem);

            if(menu.submenu){
                $("<i class='indicator fs fs-angle-right'></i>").appendTo(menuItem);
                var subParent = $("<ul></ul>").appendTo(menuItem);
                shenjian.Menu.create(menus[i].submenu,subParent);
            }else if(menu.accelerator && !menu.sublabel){
                $("<label class='sublabel'>"+menu.accelerator+"</label>").appendTo(menuItem);
            }
        }


    }
    if(parent.is("#nav-menu")){
        parent.children("li").on("click",function(ev){
            shenjian.body.toggleClass("menu-on");
            $(this).toggleClass("expand");
            ev.stopPropagation();
        }).on("mouseover",function(){
            if(shenjian.body.hasClass("menu-on") && !$(this).hasClass("expand")){
                parent.children("li.expand").removeClass("expand");
                $(this).addClass("expand");
            }
        }).on("click","li",function(ev){
            var $target = $(ev.currentTarget);
            if($target.is(".disabled")){
                ev.stopImmediatePropagation();
                return;
            }
            var role = $target.data("role");
            if(role){
                parent.trigger("menu.shenjian",[role]);
            }
        })

        shenjian.body.on("click",function(){
            if(shenjian.body.hasClass("menu-on")){
                shenjian.body.removeClass("menu-on");
                parent.children("li.expand").removeClass("expand");
            }
        }).on("keydown",function(ev){
            //快捷键实现
        })
    }
}


