class AutoBuild extends ModernUtil {
        // ── Constants ──────────────────────────────────────────────────────────────
    /** All building keys used by Grepolis, in display order. */
    static BUILDINGS = [
                'main', 'storage', 'farm', 'academy', 'temple',
                'barracks', 'docks', 'market', 'hide',
                'lumber', 'stoner', 'ironer', 'wall',
            ];

    /** Sprite background positions for each building icon. */
    static BUILDING_BG = {
                main:     [450,   0], storage: [250,  50], farm:    [150,   0],
                academy:  [  0,   0], temple:  [300,  50], barracks:[  50,   0],
                docks:    [100,   0], market:  [  0,  50], hide:    [200,   0],
                lumber:   [400,   0], stoner:  [200,  50], ironer:  [250,   0],
                wall:     [ 50, 100],
    };

    /** Blue highlight filter applied to active headers. */
    static ACTIVE_FILTER = 'brightness(100%) saturate(186%) hue-rotate(241deg)';

    /** Max queue size when the Curator advisor is active/inactive. */
    static QUEUE_MAX_CURATOR   = 7;
        static QUEUE_MAX_NO_CURATOR = 2;

    // ── Constructor ────────────────────────────────────────────────────────────
    constructor(c, s) {
                super(c, s);

            this.towns_buildings = this.storage.load('buildings', {});
                this.shiftHeld       = false;

            this.captchaActive   = false;
                this.simulateCaptcha = false;

            this.interval            = setInterval(this.main.bind(this), 20_000);
                this.checkCaptchaInterval = setInterval(this._checkCaptcha.bind(this), 300);

            uw.$.Observer(GameEvents.window.open).subscribe('modernSenate', this.updateSenate);
    }

    // ── Captcha guard ──────────────────────────────────────────────────────────
    _checkCaptcha() {
                const detected = this.simulateCaptcha || !!$('.botcheck').length || !!$('#recaptcha_window').length;
                if (detected && !this.captchaActive) {
                                this.console.log('Captcha active – AutoBuild paused');
                                clearInterval(this.interval);
                                this.captchaActive = true;
                } else if (!detected && this.captchaActive) {
                                this.console.log('Captcha cleared – AutoBuild resumed');
                                this._startInterval();
                                this.captchaActive = false;
                }
    }

    _startInterval() {
                this.interval = setInterval(this.main.bind(this), 20_000);
    }

    // ── Senate window integration ──────────────────────────────────────────────
    updateSenate = (event, handler) => {
                if (handler.context !== 'building_senate') return;

            handler.wnd.setWidth(850);
                const id = `gpwnd_${handler.wnd.getID()}`;

            const updateView = () => {
                            const poll = setInterval(() => {
                                                const $window    = $(`#${id}`);
                                                const $mainTasks = $window.find('#main_tasks');
                                                if (!$mainTasks.length) return;

                                                                     clearInterval(poll);
                                                $mainTasks.hide();

                                                                     const $new = $('<div></div>').append(this.settings()).css({
                                                                                             position: $mainTasks.css('position'),
                                                                                             left:     parseFloat($mainTasks.css('left')) - 20,
                                                                                             top:      $mainTasks.css('top'),
                                                                     });
                                                $mainTasks.after($new);

                                                                     $window.find('#techtree').css({ position: 'relative', left: '40px' });
                                                $window.css({ overflowY: 'visible' });
                            }, 10);

                            setTimeout(() => clearInterval(poll), 100);
            };

            const oldSetContent = handler.wnd.setContent2;
                handler.wnd.setContent2 = (...args) => { updateView(); oldSetContent(...args); };
    };

    // ── Settings panel HTML ────────────────────────────────────────────────────
    settings = () => {
                requestAnimationFrame(() => {
                                const town_id = uw.ITowns.getCurrentTown().id;
                                this.setPolisInSettings(town_id);
                                this.updateTitle();

                                                  uw.$('#buildings_lvl_buttons').on('mousedown', e => { this.shiftHeld = e.shiftKey; });

                                                  uw.$.Observer(uw.GameEvents.town.town_switch).subscribe(() => {
                                                                      const id = uw.ITowns.getCurrentTown().id;
                                                                      this.setPolisInSettings(id);
                                                                      this.updateTitle();
                                                  });
                });

            const filter = this.interval ? AutoBuild.ACTIVE_FILTER : '';
                return `
                        <div class="game_border" style="margin-bottom:20px">
                                    <div class="game_border_top"></div><div class="game_border_bottom"></div>
                                                <div class="game_border_left"></div><div class="game_border_right"></div>
                                                            <div class="game_border_corner corner1"></div><div class="game_border_corner corner2"></div>
                                                                        <div class="game_border_corner corner3"></div><div class="game_border_corner corner4"></div>
                                                                                    <div id="auto_build_title"
                                                                                                     style="cursor:pointer; filter:${filter}"
                                                                                                                      class="game_header bold"
                                                                                                                                       onclick="window.modernBot.autoBuild.toggle()">
                                                                                                                                                       Auto Build
                                                                                                                                                                       <span class="command_count"></span>
                                                                                                                                                                                       <div style="position:absolute; right:10px; top:4px; font-size:10px;">(click to toggle)</div>
                                                                                                                                                                                                   </div>
                                                                                                                                                                                                               <div id="buildings_lvl_buttons"></div>
                                                                                                                                                                                                                       </div>`;
    };

    // ── Per-town building controls ─────────────────────────────────────────────
    setPolisInSettings = (town_id) => {
                const town           = uw.ITowns.towns[town_id];
                const current        = { ...town.buildings().attributes };
                const target         = this.towns_buildings?.[town_id] ?? { ...current };

            const getBuildingHtml = (building) => {
                            const [bx, by] = AutoBuild.BUILDING_BG[building];
                            const tgt       = target[building];
                            const cur       = current[building];
                            const color     = tgt > cur ? 'orange' : tgt < cur ? 'red' : 'lime';

                            return `
                                        <div class="auto_build_box"
                                                         onclick="window.modernBot.autoBuild.editBuildingLevel(${town_id},'${building}',0)"
                                                                          style="cursor:pointer">
                                                                                          <div class="item_icon auto_build_building"
                                                                                                               style="background-position:-${bx}px -${by}px;">
                                                                                                                                   <div class="auto_build_up_arrow"
                                                                                                                                                            onclick="event.stopPropagation();window.modernBot.autoBuild.editBuildingLevel(${town_id},'${building}',1)">
                                                                                                                                                                                </div>
                                                                                                                                                                                                    <div class="auto_build_down_arrow"
                                                                                                                                                                                                                             onclick="event.stopPropagation();window.modernBot.autoBuild.editBuildingLevel(${town_id},'${building}',-1)">
                                                                                                                                                                                                                                                 </div>
                                                                                                                                                                                                                                                                     <p style="color:${color}" id="build_lvl_${building}" class="auto_build_lvl">
                                                                                                                                                                                                                                                                                             ${tgt}
                                                                                                                                                                                                                                                                                                                 </p>
                                                                                                                                                                                                                                                                                                                                 </div>
                                                                                                                                                                                                                                                                                                                                             </div>`;
            };

            const groupNames = Object.values(uw.ITowns.getTownGroups())
                    .filter(g => g.id > 0 && g.id !== -1 && g.towns[town_id])
                    .map(g => g.name)
                    .join(', ');
                const groups = groupNames ? `(${groupNames})` : '';

            uw.$('[id="buildings_lvl_buttons"]').html(`
                    <div id="build_settings_${town_id}">
                                <div style="width:600px; margin-bottom:3px; display:inline-flex">
                                                <a class="gp_town_link" href="${town.getLinkFragment()}">${town.getName()}</a>
                                                                <p style="font-weight:bold; margin:0 5px">[${town.getPoints()} pts]</p>
                                                                                <p style="font-weight:bold; margin:0 5px">${groups}</p>
                                                                                            </div>
                                                                                                        <div style="width:100%; display:inline-flex; gap:6px;">
                                                                                                                        ${AutoBuild.BUILDINGS.map(b => getBuildingHtml(b)).join('')}
                                                                                                                                    </div>
                                                                                                                                            </div>`);
    };

    editBuildingLevel = (town_id, name, d) => {
                const town          = uw.ITowns.getTown(town_id);
                const { max_level, min_level } = uw.GameData.buildings[name];
                const town_buildings = this.towns_buildings?.[town_id] ?? { ...town.buildings()?.attributes };
                const currentLvl     = parseInt(uw.$(`#build_lvl_${name}`).text(), 10);

            if (d !== 0) {
                            const step = this.shiftHeld ? d * 10 : d;
                            town_buildings[name] = Math.min(Math.max(currentLvl + step, min_level), max_level);
            } else {
                            // Click on icon: toggle between target-50 and current actual level
                    town_buildings[name] = (town_buildings[name] === currentLvl)
                                ? Math.min(Math.max(50, min_level), max_level)
                                        : town.buildings().attributes[name];
            }

            const actual = town.buildings().attributes[name];
                const color  = town_buildings[name] > actual ? 'orange'
                                         : town_buildings[name] < actual ? 'red'
                                         : 'lime';

            uw.$(`#build_settings_${town_id} #build_lvl_${name}`)
                    .css('color', color)
                    .text(town_buildings[name]);

            if (String(town_id) in this.towns_buildings) {
                            this.towns_buildings[town_id] = town_buildings;
                            this.storage.save('buildings', this.towns_buildings);
            }
    };

    // ── State helpers ──────────────────────────────────────────────────────────
    isActive = (town_id) => !(String(town_id) in this.towns_buildings);

    updateTitle = () => {
                const town   = uw.ITowns.getCurrentTown();
                const active = String(town.id) in this.towns_buildings;
                uw.$('[id="auto_build_title"]').css('filter', active ? AutoBuild.ACTIVE_FILTER : '');
    };

    toggle = () => {
                const town    = uw.ITowns.getCurrentTown();
                const key     = String(town.id);

            if (!(key in this.towns_buildings)) {
                            this.towns_buildings[key] = {};
                            for (const b of AutoBuild.BUILDINGS) {
                                                const lvl = parseInt(uw.$(`#build_lvl_${b}`).text(), 10);
                                                this.towns_buildings[key][b] = isNaN(lvl) ? 0 : lvl;
                            }
                            this.console.log(`${town.name}: Auto Build On`);
            } else {
                            delete this.towns_buildings[key];
                            this.console.log(`${town.name}: Auto Build Off`);
            }

            this.storage.save('buildings', this.towns_buildings);
                this.updateTitle();
    };

    // ── Main loop ──────────────────────────────────────────────────────────────
    main = async () => {
                for (const town_id of Object.keys(this.towns_buildings)) {
                                if (!uw.ITowns.towns[town_id]) {
                                                    delete this.towns_buildings[town_id];
                                                    this.storage.save('buildings', this.towns_buildings);
                                                    continue;
                                }
                                if (this.isFullQueue(town_id)) continue;
                                if (this.isDone(town_id)) {
                                                    delete this.towns_buildings[town_id];
                                                    this.storage.save('buildings', this.towns_buildings);
                                                    this.updateTitle();
                                                    this.console.log(`${uw.ITowns.getTown(town_id).name}: Auto Build Done`);
                                                    continue;
                                }
                                await this.getNextBuild(town_id);
                }
    };

    // ── Queue helpers ──────────────────────────────────────────────────────────
    isFullQueue = (town_id) => {
                const town    = uw.ITowns.getTown(town_id);
                const maxLen  = uw.GameDataPremium.isAdvisorActivated('curator')
                    ? AutoBuild.QUEUE_MAX_CURATOR
                                : AutoBuild.QUEUE_MAX_NO_CURATOR;
                return town.buildingOrders().length >= maxLen;
    };

    isDone = (town_id) => {
                const actual  = uw.ITowns.getTown(town_id).getBuildings().attributes;
                const target  = this.towns_buildings[town_id];
                return Object.keys(target).every(b => target[b] === actual[b]);
    };

    // ── Build-order logic ──────────────────────────────────────────────────────
    postBuild = async (type, town_id) => {
                const town = uw.ITowns.getTown(town_id);
                const { wood, stone, iron } = town.resources();
                const { resources_for, population_for } =
                                uw.MM.getModels().BuildingBuildData[town_id].attributes.building_data[type];

            if (town.getAvailablePopulation() < population_for) return;
                const margin = 20;
                if (wood  < resources_for.wood  + margin ||
                                stone < resources_for.stone + margin ||
                                iron  < resources_for.iron  + margin) return;

            uw.gpAjax.ajaxPost('frontend_bridge', 'execute', {
                            model_url:   'BuildingOrder',
                            action_name: 'buildUp',
                            arguments:   { building_id: type },
                            town_id,
            });
                this.console.log(`${town.getName()}: Build Up ${type}`);
                await this.sleep(1234);
    };

    postTearDown = async (type, town_id) => {
                const town = uw.ITowns.getTown(town_id);
                uw.gpAjax.ajaxPost('frontend_bridge', 'execute', {
                                model_url:   'BuildingOrder',
                                action_name: 'tearDown',
                                arguments:   { building_id: type },
                                town_id,
                });
                this.console.log(`${town.getName()}: Build Down ${type}`);
                await this.sleep(1234);
    };

    getNextBuild = async (town_id) => {
                const town = uw.ITowns.towns[town_id];

            // Current levels + in-flight orders
            const buildings = { ...town.getBuildings().attributes };
                for (const order of town.buildingOrders().models) {
                                buildings[order.attributes.building_type] += order.attributes.tear_down ? -1 : 1;
                }

            const target = this.towns_buildings[town_id];

            const check = async (build, level) => {
                            if (Array.isArray(build)) {
                                                const shuffled = [...build].sort(() => Math.random() - 0.5);
                                                for (const el of shuffled) { if (await check(el, level)) return true; }
                                                return false;
                            }
                            if (target[build] <= buildings[build]) return false;
                            if (buildings[build] < level) { await this.postBuild(build, town_id); return true; }
                            return false;
            };

            const tearCheck = async (build) => {
                            if (Array.isArray(build)) {
                                                const shuffled = [...build].sort(() => Math.random() - 0.5);
                                                for (const el of shuffled) { if (await tearCheck(el)) return true; }
                                                return false;
                            }
                            if (target[build] < buildings[build]) { await this.postTearDown(build, town_id); return true; }
                            return false;
            };

            // Tutorial path: unlock docks first
            if (buildings.docks < 1) {
                            const steps = [
                                                ['lumber', 3], ['stoner', 3], ['farm', 4], ['ironer', 3], ['storage', 4],
                                                ['temple', 3], ['main', 5], ['barracks', 5], ['storage', 5],
                                                ['stoner', 6], ['lumber', 6], ['ironer', 6], ['main', 8], ['farm', 8],
                                                ['market', 6], ['storage', 8], ['academy', 7], ['temple', 5],
                                                ['farm', 12], ['main', 15], ['storage', 12], ['main', 25], ['hide', 10],
                                            ];
                            for (const [b, lvl] of steps) { if (await check(b, lvl)) return; }
            }

            // Standard build order
            const plan = [
                            ['farm', 15],
                            [['storage', 'main'], 25],
                            ['market', 4],
                            ['hide', 10],
                            [['lumber', 'stoner', 'ironer'], 15],
                            [['academy', 'farm'], 36],
                            [['docks', 'barracks'], 10],
                            ['wall', 25],
                            [['docks', 'barracks', 'market'], 20],
                            ['farm', 45],
                            [['docks', 'barracks', 'market'], 30],
                            [['lumber', 'stoner', 'ironer'], 40],
                            ['temple', 30],
                            ['storage', 35],
                        ];
                for (const [b, lvl] of plan) { if (await check(b, lvl)) return; }

            // Tear-down phase
            const demolishOrder = [
                            'lumber', 'stoner', 'ironer', 'docks', 'barracks',
                            'market', 'temple', 'academy', 'farm', 'hide', 'storage', 'wall',
                        ];
                if (await tearCheck(demolishOrder)) return;
                if (await tearCheck('main')) return;
    };
}
