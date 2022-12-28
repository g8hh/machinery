  var version="0.99.5";
    var savefile_name="machineryGameData0995";
  var debug_mode=0;
  var qkeycard=0;

  //PLAYER (includes parameters which are reset after prestige)
  var money=0;
  var charge=0;
  var total_money=0;//total money generated within the prestige cycle
  var antimatter=0;//prestige currency during the session

  var night_shift=0;//not set in Init(), changed through prestige

  /*Chief Engineer automates the power plant. This is achieved through the chief_check flag.
  I. Generator upgrades, rlab and power limit
  All managed through auto-buy flags; the relevant warp upgrades are marked as sold from the start
  II. Generator trigger
  One(),Two(), etc. functions have a check for chief_check and trigger the button click events. Those events have checks in them to not do PlayAudio() if chief_check==1, otherwise it's a barrage of sounds in the beginning
  Additionally, in autoPowerUpgrade() there's a check when buying supplies for two, three and four to trigger button click events if supply was 0, so as to start a new generator as soon as its supplies are available
  III. overdrive trigger
  Check is done in storeState()
  IV. purchasing of the Battery and Magnetron, purchasing of Magnetron upgrades
  The checks are done in storeState() and factoryState(), as additional conditions in the price checks
  V. Magnetron trigger
  The button is triggered from magnetronRequest()
  VI. Automatic prestige
  This is checked for in InventoryUpdate(). It sets chief_check=0, so as to fully stop the generators, calls a special function ccPrestige(), which calls the standard prestigeOk() function, then tries to buy ranks, then Magnetron warp upgrades, then calls rebootOk and triggers the chief_check back ON
  */
  var chief=0;//whether you are chief engineer or not
  var chief_check=0;//whether everything should be automated
  var chief_warp_check=0;//whether you should also warp; 1 by default

  //research lab
  var actions_cycle=0;//generator actions per cycle (currently unused)
  var bonus_multiplier;//part of moneyCalc() formula
  var bonus_amount;//percentage of effectiveness
  var researchList;//contains the actual upgrades
  var research_playhead;//the number of an item we're creating so that we can control when to show what
  var rlab_lastprice;//to generate new prices
  var rlab_autobuy_toggle_flag=0;
  var rlab_buy_cycle=0;//to avoid a barrage of purchases all at once
  var ogr=2;//overdrive price growth rate - not set in Init()
  var mT;//MersenneTwister
    var researchSeed;
    var researchRNG;//contains pre-generated rlab data

  //moneyCalc multipliers (ones that are always part of the moneyCalc formula)
  var magnetron_multiplier;
  var am_radiation_multiplier=1;//set to 1 here; will be a different value only when antimatter_cubes==0, which is almost never, so I don't want to explicitly set it to 1 in nAC() every time

  //PRESTIGE (most items here are not reset after prestige)
  //these are set up here, outside of Init(), because they are consistent across prestige cycles
  const AM_BASE_COST=1e9;
  var prevAntimatterCost=0;
  var nextAntimatterCost=0;//how much energy needs to be generated till next antimatter particle is awarded;
  var all_time_antimatter=0;//works across cycles and is used in the antimatter formula, but says nothing regarding how much antimatter cubes you own, since depends on all_time_money only
  var antimatter_cubes=0;//this is the currency that antimatter is converted into; it says how much all_time_antimatter has been actually converted through warping into cubes
  var antimatter_cubes_spent=0;//how much antimatter cubes was spent
  var all_time_money=0;//total money generated - across cycles
  var ultimate_ratio;//this is the ratio of antimatter generated this run vs all_time_antimatter, expressed as percentage
    var prestige_multiplier=1;//this is the upgrade that increases the efficiency of the generators (amplifier)
    var money_limit_init=50;//this will depend on the prestige multiplier, so that people start with a larger power limit, so as not to click repeatedly
    var money_limit_upgrade_price_init=10;//this will depend on the prestige multiplier too

    //PRESTIGE PRICES
    var warp_price=5;
    var warp_price_rate=10;
      var warp_panel1_upgrade_flag=1;
      var warp_panel2_upgrade_flag=0;
      var warp_panel3_upgrade_flag=0;
      var warp_panel4_upgrade_flag=0;
      var warp_rank1_training1_flag=0;
      var warp_rank2_training1_flag=0;
      var warp_rank2_training2_flag=0;

      var warp_challenge1_flag=0;//0-cannot claim 1-can claim 2-claimed 3-failed
      var warp_challenge2_flag=0;
      var warp_challenge3_flag=0;
      var warp_challenge4_flag=0;
      var buff_challenge1_flag=0;//this is set to 3 in rebootOk(), since it's warpless; it's reset to 0 in quantum_wipe_upgrade; all this if buff_challenge1_flag!=1 or !=2
      var buff_challenge2_flag=0;

      var secret1_flag=0;
      var secret2_flag=0;

      /*
      quantum_upgrade_flag[0] - Molten Core
      quantum_upgrade_flag[1] - Non-organic Biology
      quantum_upgrade_flag[2] - Zoo Keeper
      quantum_upgrade_flag[3] - Solar Amplifier
      quantum_upgrade_flag[4] - Particle Optimizer
      quantum_upgrade_flag[5] - Synchrotron
      */
      var quantum_upgrade_flag=[0,0,0,0,0,0];
      var quf_temp_bag=[0,0,0,0,0,0];



    //PRESTIGE SPECIAL VARIABLES
    var warp_max_magnetron_duration=60;//default max magnetron duration; later upgraded to 120
    var warp_max_magnetron_multiplier=10;//default max magnetron multiplier; later upgraded to 20
    var warp_magnetron_alerting=0;//default value, later upgraded to 1

    var prestige_flag=0;//to differentiate between inspecting prices and actually warping



    //INTERDIMENSIONAL WARP
    const POS_BASE_COST=1e6;//positron base cost
    var positrons=0;//positrons generated this cycle
    var all_time_positrons=0;
    var positron_cubes=0;//cubes that were actually transfered, but this is currently not used and all_time_positron_cubes is used for everything instead, as we reset the amount of all_time_positron_cubes with every ppa_reset
    var positron_cubes_spent=0;//cubes that were transferred and spent
    var all_time_positron_cubes=0;//all time cubes created, regardless of whether they were transferred or spent
    var prevPositronCubesCost=0;
    var nextPositronCubesCost=0;

    //Power Plant Arena (PPA)
    var powerplants_amount=0;//amount of powerplants built
    var time_fundamental=1;//0.25 when upgraded
    var powerplants_multiplier=1;//quantum amplifier
    var ppa_upgrade_price=1;


  //UPGRADES
  var money_limit;
  var one_supply;
  var two_supply;
  var three_supply;
  var four_supply;
  var one_generation;
  var two_generation;
  var three_generation;
  var four_generation;

  var actions;
  var actions_limit=100;//setting here, because it's not set in Init(); later it can be reset through prestige

  //UPGRADE PBs + UPGRADE MULTIPLIER LEVELS
  var one_upgrade_supply_limit_stage;
  var one_upgrade_effectiveness_stage;
  var one_upgrade_effectiveness_level;

  var two_upgrade_supply_limit_stage;
  var two_upgrade_effectiveness_stage;
  var two_upgrade_effectiveness_level;

  var three_upgrade_supply_limit_stage;
  var three_upgrade_effectiveness_stage;
  var three_upgrade_effectiveness_level;

  var four_upgrade_supply_limit_stage;
  var four_upgrade_effectiveness_stage;
  var four_upgrade_effectiveness_level;

  //PRICES
  var one_upgrade_supply_limit_price;
  var one_upgrade_effectiveness_price;
  var one_upgrade_generation_price;

  var two_upgrade_supply_limit_price;
  var two_upgrade_effectiveness_price;
  var two_upgrade_generation_price;

  var three_upgrade_supply_limit_price;
  var three_upgrade_effectiveness_price;
  var three_upgrade_generation_price;

  var four_upgrade_supply_limit_price;
  var four_upgrade_effectiveness_price;
  var four_upgrade_generation_price;

  var money_limit_upgrade_price;
  var overdrive_price=1000;//not set in Init()
  var generation_limit=10;//the limit of how far one can upgrade the generators

  var sgr=0.2;//supply growth rate 0.2
  var egr=0.25;//effectiveness growth rate - the rate at which generator effectiveness (power) prices grow

  var supply_base;

  //buymax
  var buymax_toggle_flag=0;
  var machines_buymax_toggle_flag=0;

  var effectiveness_cycles=200;//the parameter for buymax for power
  var supply_cycles=10;//the parameter for buymax for supply
  var effectiveness_tank_price;
  var supply_tank_price;
  var power_prices=[];
  var power_cumulative_prices=[];

  //tank prices
  var tank_toggle_flag=[0,0,0,0];
  var power_price_check=[0,0,0,0];
  var tank_price=[0,0,0,0];

  //LOOPS
  var one_interval;
  var two_interval;
  var three_interval;
  var four_interval;
  var save_timer;
  var telescope_timer;
  var furnace_cooling_timer;
  var magnetron_interval;
  var ppa_interval;

  //PRICES
  var one_price;//this is the supply limit for each generator. the naming is very confusing, for which I apologize, mostly to my future self, I guess
  var two_price;
  var three_price;
  var four_price;

  //MULTIPLIERS (effectiveness)
  var one_multiplier;
  var two_multiplier;
  var three_multiplier;
  var four_multiplier;

  var one_init_multiplier;//these are used to automatically generate prices for generator generations
  var two_init_multiplier;
  var three_init_multiplier;
  var four_init_multiplier;

  //PB ratio variables
  var one_recent_money;//this is used to understand each generator's contribution
  var two_recent_money;
  var three_recent_money;
  var four_recent_money;

  //battery charges per generator
  var one_charge=0;
  var two_charge=0;
  var three_charge=0;
  var four_charge=0;


  //MACHINES
  //machine states
  var battery_state=0;//0 - locked, 1- unlocked
  var magnetron_state=0;
  var foundry_state=0;
  var engden_state=0;//this is not set in Init() and can be changed with prestige; this defines if you are at least rank1
  var lscanner_state=0;//same as above, defines rank2
  var pc_state=0;
  var radiator_state=0;
  var gambling_state=0;
    //BATTERY
    var charge=0;
    var charge_limit=50;
    var charge_limit_upgrade_price;
    var battery_unlock_upgrade_price;
    var battery_charge_percentage=0;
    var battery_charge_percentage_limit=1;
    var charge_throughput_upgrade_price;
    //MAGNETRON
    var magnetron_unlock_upgrade_price=Math.pow(10,6);
    var device_magnetron_multiplier;//this holds the value of the multipler in the magnetron. magnetron_multiplier is only set to device_magnetron_multiplier for a limited duration
    var magnetron_duration;
    var magnetron_multiplier_upgrade_price;
    var magnetron_duration_upgrade_price;
    var magnetron_probability_max=2000;//how likely is the magnetron to be armed
    var magnetron_choice=999;//which symbol was chosen; 999 means no symbol is chosen
    //engden
    var auxiliary_effectiveness=1;
    var auxiliary_effectiveness1;//for different levers. the final auxiliary_effectiveness is comprised of the two
    var auxiliary_effectiveness2;
    var auxiliary_probability_max=150;//how fast couplings get misaligned
    var aux_eff_unit=50;
    //lifeforms scanner
    var lifeforms_collection=[0,0,0,0,0,0,0,0];
    var animal1_bonus_multiplier=0;//this is 0, because it is being added to bonus_multiplier in moneyCalc()
    var animal2_magnetron_duration=0;//this is being added
    var animal3_magnetron_multiplier=0;//this is being added
    var animal4_magnetron_probability_modifier=0;//this is being subtracted
    var animal5_auxiliary_effectiveness_modifier=0;//this is being added
    var animal6_components_multiplier=1;//this is being multiplied
    var animal7_battery_charge_multiplier=1;//this is being multiplied
    var animal8_radiator_boost=0;//this is being added
    var recency=0;//whether the player rebooted recently or not, which affects how frequently they encounter lifeforms
    //foundry
    var foundry_components;//components
    var foundry_unlock_upgrade_price;
    var foundry_heating_stage;//0-3; cycling through this variable heats up the furnace
    var foundry_temperature;
    var foundry_components_cycle_upgrade_price;
    var foundry_components_multiplier;//how many components produced per cycle
    var foundry_components_multiplier_qm=1;//quantum multiplier
    var foundry_production_flag;//whether the foundry is in production mode or not
    var fccu_stage;//handling the foundry progress bar
    var fccu_level;//handling the foundry progress bar
    var foundry_waste;
    var foundry_waste_limit;
    //radiator
    var radiator_unlock_upgrade_price;
    //these have to be set here as well, to ensure no edge cases lead to them being undefined
    var radiator_one_multiplier=1;
    var radiator_two_multiplier=1;
    var radiator_three_multiplier=1;
    var radiator_four_multiplier=1;
    var radiator_boost=10;
    var radiator_active=0;
    var radiator_playhead=0;
    //pc
    var pc_seconds_amount;//amount of seconds, as opposed to pc_seconds, which is an html element
    var pc_emission;
    var pc_unlock_upgrade_price;
    var pc_emission_upgrade_price;
    var pc_emission_boost=1;//qm upgrade
    //gambling facility
    var gambling_choice=[];//the symbol that was chosen
    var gambling_boosts=0;
    var gambling_collect_flag=1;//whether a symbol was collected or not from the armed magnetron; default - 1


  //UI
  var audio_volume=0.5;
  var audio_mute=0;
    var audio_mute_one=0;
    var audio_mute_two=0;
    var audio_mute_three=0;
    var audio_mute_four=0;
    var audio_mute_allgen=0;
    var audio_tick2;
    var audio_click4;
    var audio_click5;
    var audio_pbtick;
    var audio_bonus;
    var audio_initiated=0;
    var audio_override=0;//click events cannot receive parameters, unless you use them to call an anonymous function. I don't want to move one_upgrade_supply_limit into an anonymous function; instead, I am using this lame ass flag to notify the click function that it is triggered by auto-buy, so it won't play the click sound effect
  var save_sec=60;
  var pb_one_width;
  var pb_money_width;
  var pb_battery_width;
  var pb_antimatter_width;
  var pb_supply_limit_width;
  var stats_window_flag=0;//whether stats window is open or not
  var prestige_window_flag=0;
  var reset_window_flag=0;
  var settings_window_flag=0;
  var bonusbox_window_flag=0;
  var rankinfo_window_flag=0;
  var magicnumber_window_flag=0;
  var debug=0;
  var one_x=0;
  var two_x=0;
  var three_x=0;
  var four_x=0;
  var telescope_list=[];
  var last_animal=999;
  var last_animal_id;
  var scientific_ui=0;//whether to show scientific format
  var magnetron_probability_game_set=['⌽','⌓','⎔','⎊','⍿','⍙'];
  var autobuy_purse=[0,0,0];
  var rank_block_show_details_flag=0;
          var battery_min_flag=0;
          var magnetron_min_flag=0;
          var gambling_min_flag=0;
          var foundry_min_flag=0;
          var radiator_min_flag=0;
          var pc_min_flag=0;

  //OPTIMIZATIONS
  //to only check buttons on the open tab
  var active_tab_flag=1;
  //to only calculate ratios when effectiveness changes
  var one_ratios_flag;
  var two_ratios_flag;
  var three_ratios_flag;
  var four_ratios_flag;

  //DEBUG
  var test_interval=null;


  //CACHE

  //PRESTIGE CACHE
  var warp_rank1_upgrade;
  var warp_rank2_upgrade;
  var warp_rank3_upgrade;
  var warp_rank4_upgrade;
  var warp_wallpaper_upgrade;
  var warp_magnetron_alerting_upgrade;
  var warp_magnetron_duration_upgrade;
  var warp_magnetron_multiplier_upgrade;

  //MACHINES CACHE
  var pb_battery;
  var pb_battery_indicator;
  var charge_limit_upgrade;
  var charge_limit_label;
  var battery_block;
  var battery_lock_block;
  var battery_unlock_upgrade;
  var battery_percent_up;
  var battery_percent_down;
  var battery_charge_percentage_label;
  var battery_effectiveness_label;
  var charge_throughput_label;
  var charge_throughput_upgrade;

  var magnetron_lock_block;
  var magnetron_block;
  var magnetron_button;
  var magnetron_unlock_upgrade;
  var magnetron_multiplier_label;
  var magnetron_duration_label;
  var magnetron_duration_upgrade;
  var magnetron_multiplier_upgrade;

  var mc_lock_block;
  var mc_block;
  var mc_unlock_upgrade;

  var foundry_lock_block;
  var foundry_block;
  var foundry_unlock_upgrade;

  var battery_info_box;
  var battery_info_close;
  var battery_info;

  var magnetron_info_box;
  var magnetron_info_close;
  var magnetron_info;

  var auxiliary_lever1;
  var auxiliary_lever2;
  var auxiliary_effectiveness_label;
  var engden_title;
  var engden_block;

  var radiator_block;
  var radiator_lock_block;
  var radiator_boost_label;
  var radiator_button_left;
  var radiator_button_right;
  var radiator_unlock_upgrade;
  var radiator_info_box;
  var radiator_info_close;
  var radiator_info;
  var radiator_button_center;
  var lamps_port;

  var pc_info;
  var pc_info_box;
  var pc_info_close;
  var pc_lock_block;
  var pc_block;
  var pc_unlock_upgrade;
  var pc_seconds;
  var pc_positrons_label;
  var pc_positron_cubes_label;
  var pc_emission_label;
  var pc_emission_upgrade;

  //ALL CACHE
  var all;
  var prestige_board;
  var button_one;
  var button_two;
  var button_three;
  var button_four;
  var one_supply_label;
  var two_supply_label;
  var three_supply_label;
  var four_supply_label;
  var one_tab;
  var two_tab;
  var three_tab;
  var four_tab;
  var pb_money;
  var money_limit_upgrade;
  var one_tab_contents;
  var two_tab_contents;
  var three_tab_contents;
  var four_tab_contents;

  var one_upgrade_supply_limit;
  var pb_one_upgrade_supply_limit;
  var one_upgrade_effectiveness;
  var pb_one_upgrade_effectiveness;

  var two_upgrade_supply_limit;
  var pb_two_upgrade_supply_limit;
  var two_upgrade_effectiveness;
  var pb_two_upgrade_effectiveness;

  var three_upgrade_supply_limit;
  var pb_three_upgrade_supply_limit;
  var three_upgrade_effectiveness;
  var pb_three_upgrade_effectiveness;

  var four_upgrade_supply_limit;
  var pb_four_upgrade_supply_limit;
  var four_upgrade_effectiveness;
  var pb_four_upgrade_effectiveness;

  var one_ratio_label;
  var two_ratio_label;
  var three_ratio_label;
  var four_ratio_label;

  var money_limit_label;
  var one_effectiveness_label;
  var two_effectiveness_label;
  var three_effectiveness_label;
  var four_effectiveness_label;

  var one_generation_label;
  var two_generation_label;
  var three_generation_label;
  var four_generation_label;

  var one_upgrade_generation;
  var two_upgrade_generation;
  var three_upgrade_generation;
  var four_upgrade_generation;

  var one_name_label;
  var two_name_label;
  var three_name_label;
  var four_name_label;

  var audio_toggle;
  var color_block;

  var pb_money_indicator;
  var pb_one_effectiveness_indicator;
  var pb_two_effectiveness_indicator;
  var pb_three_effectiveness_indicator;
  var pb_four_effectiveness_indicator;
  var pb_one_supply_indicator;
  var pb_two_supply_indicator;
  var pb_three_supply_indicator;
  var pb_four_supply_indicator;

  var prestige_upgrade;

  var save_timer_label;
  var save_upgrade;
  var reset_upgrade;
  var reset_infobox;
  var gameboard;
  var reset_ok;
  var reset_cancel;
  var prestige_infobox;
  var prestige_ok;
  var prestige_cancel;
  var generator_tabs;
  var arrow_left;
  var arrow_right;
  var factory_switch;
  var control_panel_tab;
  var stats_cancel;
  var stats_infobox;
  var manual_upgrade;
  var total_money_label;
  var all_time_money_label;
  var tillNextAntimatter_label;
  var antimatter_label;
  var ac_label;
  var pb_antimatter;
  var pb_antimatter_indicator;
  var settings_upgrade;
  var settings_infobox;
  var settings_cancel;
  var audio_toggle_one;
  var audio_toggle_two;
  var audio_toggle_three;
  var audio_toggle_four;
  var audio_toggle_allgen;
  var audio_control_volume;
  var gamesavedump;
  var import_save_button;
  var import_save_dump;
  var g_electric;
  var g_plasma;
  var g_nuclear;
  var g_gravity;
  var antimatter_block;
  var ac_owned_label;
  var reboot_upgrade;
  var magicnumber_block;
  var rank_block;
  var rank_label;
  var magicnumber_label;
  var incorrectsave_infobox;
  var incorrectsave_infobox_cancel;
  var bonusbox;
  var bonusbox_text;
  var telescope;

  var bonusboxblock_1;
  var bonusboxblock_2;
  var bonusboxblock_3;
  var bonusboxblock_4;
  var bonusboxblock_5;
  var bonusboxblock_6;
  var bonusboxblock_7;
  var bonusboxblock_8;

  var ac_stock_label;
  var foundry_info_box;
  var foundry_info_close;
  var foundry_info;
  var engden_info_box;
  var engden_info_close;
  var engden_info;
  var rank_infobox;
  var rank_infobox_cancel;
  var rank_description_label;
  var furnace_screen;
  var foundry_components_multiplier_label;
  var foundry_components_cycle_upgrade;
  var foundry_components_label;
  var pb_components_multiplier_indicator;
  var pb_components_multiplier;
  var lscanner_info;
  var lscanner_title;
  var lscanner_block;
  var lscanner_info_box;
  var lscanner_info_close;
  var animal1;
  var animal2;
  var animal3;
  var animal4;
  var animal5;
  var animal6;
  var animal7;
  var animal8;
  var ac_all_label;
  var animal2_magnetron_duration_label;
  var animal3_magnetron_multiplier_label;
  var animal7_battery_charge_multiplier_label;
  var animal6_components_multiplier_label;
  var animal8_radiator_boost_label;
  var one_price_label;
  var two_price_label;
  var three_price_label;
  var four_price_label;
  var overdrive_label;
  var overdrive_upgrade;
  var rlab_info_box;
  var rlab_info_close;
  var rlab_info;
  var sup_one_label;
  var sup_two_label;
  var sup_three_label;
  var sup_four_label;
  var eepc_panel;
  var rlab_panel;
  var aa_panel;
  var rank_block_panel;
  var night_shift_toggle;
  var overdrive_panel;
  var one_buymax;
  var buymax_toggle;
  var am_label;
  var reboot_backtogame;
  var prestige_inspect;
  var warp_panel1_upgrade;
  var warp_panel2_upgrade;
  var one_generation_block;
  var two_generation_block;
  var three_generation_block;
  var four_generation_block;
  var magicnumber_infobox;
  var magicnumber_infobox_cancel;
  var warp_panel3_upgrade;
  var warp_panel4_upgrade;
  var rlab_autobuy_toggle;
  var repopulation_label;
  var foundry_waste_label;
  var foundry_recycle_upgrade;
  var machines_buymax_toggle;
  var titlecard;
  var general_info_box;
  var general_info_close;
  var general_info;
  var one_effectiveness_block;
  var two_effectiveness_block;
  var three_effectiveness_block;
  var four_effectiveness_block;
  var toggle_scientific;
  var magnetron_probability_max_label;
  var magnetron_probability_game_label;
  var all_button8s;
  var warp_rank1_training1_upgrade;
  var warp_rank2_training1_upgrade;
  var warp_rank2_training2_upgrade;
  var battery_percent_down_down;
  var battery_percent_up_up;
  var warp_challenge1_upgrade;
  var warp_challenge2_upgrade;
  var positron_cubes_owned_label;
  var establish_powerplant_upgrade;
  var main_container;
  var powerplant_arena;
  var pp1;
  var pp2;
  var pp3;
  var pp4;
  var pp5;
  var pp2_add;
  var pp3_add;
  var pp4_add;
  var pp5_add;
  var item3_pp_plus;
  var item3_pp;
  var pp_quadrant;
  var ppa_upgrade0;
  var ppa_upgrade1;
  var ppa_upgrade2;
  var ppa_upgrade3;
  var ppa_upgrade4;
  var ppa_upgrade0_title;
  var ppa_upgrade1_title;
  var ppa_upgrade2_title;
  var ppa_upgrade3_title;
  var ppa_upgrade4_title;
  var ppa_upgrade1_rank_block;
  var ppa_upgrade2_rank_block;
  var ppa_upgrade3_rank_block;
  var ppa_upgrade4_rank_block;
  var chief_cc_info_box;
  var chief_cc_info_close;
  var chief_cc_info;
  var chief_cc_block;
  var chief_check_toggle;
  var gambling_info_box;
  var gambling_info_close;
  var gambling_info;
  var gambling_symbol_label;
  var gambling_block;
  var buff_challenge1_upgrade;
  var buff_challenge2_upgrade;
  var warp_qm1_upgrade;
  var warp_qm2_upgrade;
  var warp_qm3_upgrade;
  var warp_qm4_upgrade;
  var warp_qm5_upgrade;
  var warp_qm6_upgrade;
  var warp_challenge3_upgrade;
  var warp_challenge4_upgrade;
  var rank_block_show_details;
  var rank_upgrade1_descr;
  var rank_upgrade2_descr;
  var rank_upgrade3_descr;
  var sm_rank_desc;
  var debug_mode_panel;
  var rank_upgrade1_plank;
  var rank_upgrade2_plank;
  var rank_upgrade3_plank;
  var debug_qkeycard_upgrade;
  var debug_save_upgrade;
  var debug_close_upgrade;
  var debug_qkeycard2_upgrade;
  var chief_warp_check_toggle;
  var battery_body;
  var magnetron_body;
  var foundry_body;
  var radiator_body;
  var pc_body;
  var battery_title;
  var magnetron_title;
  var foundry_title;
  var radiator_title;
  var pc_title;
  var gambling_body;
  var gambling_title;
  var qm_rewards;
  var qm1_rank_block;
  var qm2_rank_block;
  var qm3_rank_block;
  var qm4_rank_block;
  var qm5_rank_block;
  var qm6_rank_block;
  var rank_qm1_descr;
  var rank_qm2_descr;
  var rank_qm3_descr;
  var rank_qm4_descr;
  var rank_qm5_descr;
  var rank_qm6_descr;
  var rank_qm1_plank;
  var rank_qm2_plank;
  var rank_qm3_plank;
  var rank_qm4_plank;
  var rank_qm5_plank;
  var rank_qm6_plank;
  var warp_qm_table;
  var quantum_wipe_upgrade;
  var warp_qm_warning;
  var warp_qm_warning_close;
  var warp_qm_confirm;
  var warp_qm_confirm_ok;
  var warp_qm_confirm_cancel;
  var copy_save_button;
  var save_copied;
  var challenge_reward2_block;
  var challenge_reward2_descr;
  var challenge_reward2_plank;
  var challenge_rewards;
  var warp_qm_challenges;
  var gambling_collect_upgrade;
  var gambling_boosts_label;
  var gambling_boosts_upgrade;
  var warp_zoo_keeper_title;
  var warp_zoo_keeper_descr;
  var warp_solar_amp_title;
  var warp_solar_amp_descr;
  var rank_qm3_title;
  var rank_qm4_title;
  var system_monitoring;
  var sysmon_am_radiation;
  var sysmon_am_radiation_descr;
  var sysmon_am_radiation_title;
  var warp_warpless_table;
  var endgame;
  var endgame_back_button;
  var endgame_quantum_wipe_label;
  var power_plants_built_label;
  var warp_view_warning;
  var one_tank_toggle;
  var two_tank_toggle;
  var three_tank_toggle;
  var four_tank_toggle;

  $(document).ready(function(){

    //CACHE

    one_tank_toggle=$("#one_tank_toggle");
    two_tank_toggle=$("#two_tank_toggle");
    three_tank_toggle=$("#three_tank_toggle");
    four_tank_toggle=$("#four_tank_toggle");
    warp_view_warning=$("#warp_view_warning");
    power_plants_built_label=$("#power_plants_built_label");
    endgame_quantum_wipe_label=$("#endgame_quantum_wipe_label");
    endgame_back_button=$("#endgame_back_button");
    endgame=$("#endgame");
    warp_warpless_table=$("#warp_warpless_table");
    sysmon_am_radiation_title=$("#sysmon_am_radiation_title");
    sysmon_am_radiation_descr=$("#sysmon_am_radiation_descr");
    sysmon_am_radiation=$("#sysmon_am_radiation");
    system_monitoring=$("#system_monitoring");
    rank_qm3_title=$("#rank_qm3_title");
    rank_qm4_title=$("#rank_qm4_title");
    warp_zoo_keeper_title=$("#warp_zoo_keeper_title");
    warp_zoo_keeper_descr=$("#warp_zoo_keeper_descr");
    warp_solar_amp_title=$("#warp_solar_amp_title");
    warp_solar_amp_descr=$("#warp_solar_amp_descr");
    gambling_boosts_upgrade=$("#gambling_boosts_upgrade");
    gambling_collect_upgrade=$("#gambling_collect_upgrade");
    gambling_boosts_label=$("#gambling_boosts_label");
    warp_qm_challenges=$("#warp_qm_challenges");
    challenge_rewards=$("#challenge_rewards");
    challenge_reward2_block=$("#challenge_reward2_block");
    challenge_reward2_descr=$("#challenge_reward2_descr");
    challenge_reward2_plank=$("#challenge_reward2_plank");
    save_copied=$("#save_copied");
    copy_save_button=$("#copy_save_button");
    warp_qm_confirm=$("#warp_qm_confirm");
    warp_qm_confirm_ok=$("#warp_qm_confirm_ok");
    warp_qm_confirm_cancel=$("#warp_qm_confirm_cancel");
    warp_qm_warning_close=$("#warp_qm_warning_close");
    warp_qm_warning=$("#warp_qm_warning");
    quantum_wipe_upgrade=$("#quantum_wipe_upgrade");
    warp_qm_table=$("#warp_qm_table");
    rank_qm1_plank=$("#rank_qm1_plank");
    rank_qm2_plank=$("#rank_qm2_plank");
    rank_qm3_plank=$("#rank_qm3_plank");
    rank_qm4_plank=$("#rank_qm4_plank");
    rank_qm5_plank=$("#rank_qm5_plank");
    rank_qm6_plank=$("#rank_qm6_plank");
    rank_qm1_descr=$("#rank_qm1_descr");
    rank_qm2_descr=$("#rank_qm2_descr");
    rank_qm3_descr=$("#rank_qm3_descr");
    rank_qm4_descr=$("#rank_qm4_descr");
    rank_qm5_descr=$("#rank_qm5_descr");
    rank_qm6_descr=$("#rank_qm6_descr");
    qm1_rank_block=$("#qm1_rank_block");
    qm2_rank_block=$("#qm2_rank_block");
    qm3_rank_block=$("#qm3_rank_block");
    qm4_rank_block=$("#qm4_rank_block");
    qm5_rank_block=$("#qm5_rank_block");
    qm6_rank_block=$("#qm6_rank_block");
    qm_rewards=$("#qm_rewards");
    gambling_body=$("#gambling_body");
    gambling_title=$("#gambling_title");
    pc_title=$("#pc_title");
    radiator_title=$("#radiator_title");
    foundry_title=$("#foundry_title");
    battery_title=$("#battery_title");
    pc_body=$("#pc_body");
    radiator_body=$("#radiator_body");
    battery_body=$("#battery_body");
    foundry_body=$("#foundry_body");
    magnetron_title=$("#magnetron_title");
    magnetron_body=$("#magnetron_body");
    chief_warp_check_toggle=$("#chief_warp_check_toggle");
    debug_qkeycard2_upgrade=$("#debug_qkeycard2_upgrade");
    debug_close_upgrade=$("#debug_close_upgrade");
    debug_save_upgrade=$("#debug_save_upgrade");
    debug_qkeycard_upgrade=$("#debug_qkeycard_upgrade");
    rank_upgrade1_plank=$("#rank_upgrade1_plank");
    rank_upgrade2_plank=$("#rank_upgrade2_plank");
    rank_upgrade3_plank=$("#rank_upgrade3_plank");
    debug_mode_panel=$("#debug_mode_panel");
    rank_upgrade1_descr=$("#rank_upgrade1_descr");
    rank_upgrade2_descr=$("#rank_upgrade2_descr");
    rank_upgrade3_descr=$("#rank_upgrade3_descr");
    sm_rank_desc=$(".sm_rank_desc");
    rank_block_show_details=$("#rank_block_show_details");
    warp_challenge4_upgrade=$("#warp_challenge4_upgrade");
    warp_challenge3_upgrade=$("#warp_challenge3_upgrade");
    warp_qm4_upgrade=$("#warp_qm4_upgrade");
    warp_qm5_upgrade=$("#warp_qm5_upgrade");
    warp_qm6_upgrade=$("#warp_qm6_upgrade");
    warp_qm3_upgrade=$("#warp_qm3_upgrade");
    warp_qm2_upgrade=$("#warp_qm2_upgrade");
    warp_qm1_upgrade=$("#warp_qm1_upgrade");
    buff_challenge2_upgrade=$("#buff_challenge2_upgrade");
    buff_challenge1_upgrade=$("#buff_challenge1_upgrade");
    gambling_block=$("#gambling_block");
    gambling_symbol_label=$("#gambling_symbol_label");
    gambling_info=$("#gambling_info");
    gambling_info_close=$("#gambling_info_close");
    gambling_info_box=$("#gambling_info_box");
    chief_check_toggle=$("#chief_check_toggle");
    chief_cc_block=$("#chief_cc_block");
    chief_cc_info=$("#chief_cc_info");
    chief_cc_info_close=$("#chief_cc_info_close");
    chief_cc_info_box=$("#chief_cc_info_box");
    ppa_upgrade4_rank_block=$("#ppa_upgrade4_rank_block");
    ppa_upgrade3_rank_block=$("#ppa_upgrade3_rank_block");
    ppa_upgrade2_rank_block=$("#ppa_upgrade2_rank_block");
    ppa_upgrade1_rank_block=$("#ppa_upgrade1_rank_block");
    ppa_upgrade0_title=$("#ppa_upgrade0_title");
    ppa_upgrade1_title=$("#ppa_upgrade1_title");
    ppa_upgrade2_title=$("#ppa_upgrade2_title");
    ppa_upgrade3_title=$("#ppa_upgrade3_title");
    ppa_upgrade4_title=$("#ppa_upgrade4_title");
    ppa_upgrade0=$("#ppa_upgrade0");
    ppa_upgrade1=$("#ppa_upgrade1");
    ppa_upgrade2=$("#ppa_upgrade2");
    ppa_upgrade3=$("#ppa_upgrade3");
    ppa_upgrade4=$("#ppa_upgrade4");
    pp_quadrant=$(".pp_quadrant");
    item3_pp=$(".item3_pp");
    item3_pp_plus=$(".item3_pp_plus");
    pp2_add=$("#pp2_add");
    pp3_add=$("#pp3_add");
    pp4_add=$("#pp4_add");
    pp5_add=$("#pp5_add");
    pp1=$("#pp1");
    pp2=$("#pp2");
    pp3=$("#pp3");
    pp4=$("#pp4");
    pp5=$("#pp5");
    powerplant_arena=$("#powerplant_arena");
    main_container=$("#main_container");
    establish_powerplant_upgrade=$("#establish_powerplant_upgrade");
    positron_cubes_owned_label=$("#positron_cubes_owned_label");
    warp_challenge1_upgrade=$("#warp_challenge1_upgrade");
    warp_challenge2_upgrade=$("#warp_challenge2_upgrade");
    pc_block=$("#pc_block");
    pc_lock_block=$("#pc_lock_block");
    pc_unlock_upgrade=$("#pc_unlock_upgrade");
    pc_seconds=$("#pc_seconds");
    pc_positrons_label=$("#pc_positrons_label");
    pc_positron_cubes_label=$("#pc_positron_cubes_label");
    pc_emission_label=$("#pc_emission_label");
    pc_emission_upgrade=$("#pc_emission_upgrade");
    pc_info=$("#pc_info");
    pc_info_box=$("#pc_info_box");
    pc_info_close=$("#pc_info_close");

    battery_percent_up_up=$("#battery_percent_up_up");
    battery_percent_down_down=$("#battery_percent_down_down");

    lamps_port=$("#lamps_port");
    radiator_button_center=$("#radiator_button_center");
    radiator_info_box=$("#radiator_info_box");
    radiator_info_close=$("#radiator_info_close");
    radiator_info=$("#radiator_info");
    radiator_unlock_upgrade=$("#radiator_unlock_upgrade");
    radiator_button_right=$("#radiator_button_right");
    radiator_button_left=$("#radiator_button_left");
    radiator_boost_label=$("#radiator_boost_label");
    radiator_lock_block=$("#radiator_lock_block");
    radiator_block=$("#radiator_block");

    warp_rank2_training2_upgrade=$("#warp_rank2_training2_upgrade");
    warp_rank2_training1_upgrade=$("#warp_rank2_training1_upgrade");
    warp_rank1_training1_upgrade=$("#warp_rank1_training1_upgrade");
    all_button8s=$(".button8");
    magnetron_probability_game_label=$("#magnetron_probability_game_label");
    magnetron_probability_max_label=$("#magnetron_probability_max_label");
    toggle_scientific=$("#toggle_scientific");
    four_effectiveness_block=$("#four_effectiveness_block");
    three_effectiveness_block=$("#three_effectiveness_block");
    two_effectiveness_block=$("#two_effectiveness_block");
    one_effectiveness_block=$("#one_effectiveness_block");
    general_info=$("#general_info");
    general_info_close=$("#general_info_close");
    general_info_box=$("#general_info_box");
    titlecard=$("#titlecard");
    machines_buymax_toggle=$("#machines_buymax_toggle");
    foundry_waste_label=$("#foundry_waste_label");
    foundry_recycle_upgrade=$("#foundry_recycle_upgrade");
    repopulation_label=$("#repopulation_label");
    rlab_autobuy_toggle=$("#rlab_autobuy_toggle");
    warp_panel4_upgrade=$("#warp_panel4_upgrade");
    warp_panel3_upgrade=$("#warp_panel3_upgrade");
    magicnumber_infobox=$("#magicnumber_infobox");
    magicnumber_infobox_cancel=$("#magicnumber_infobox_cancel");
    one_generation_block=$("#one_generation_block");
    two_generation_block=$("#two_generation_block");
    three_generation_block=$("#three_generation_block");
    four_generation_block=$("#four_generation_block");
    warp_panel1_upgrade=$("#warp_panel1_upgrade");
    warp_panel2_upgrade=$("#warp_panel2_upgrade");
    prestige_inspect=$("#prestige_inspect");
    reboot_backtogame=$("#reboot_backtogame");
    am_label=$("#am_label");
    one_buymax=$("#one_buymax");
    buymax_toggle=$("#buymax_toggle");
    overdrive_panel=$("#overdrive_panel");
    night_shift_toggle=$("#night_shift_toggle");
    rank_block_panel=$("#rank_block_panel");
    eepc_panel=$("#eepc_panel");
    rlab_panel=$("#rlab_panel");
    aa_panel=$("#aa_panel");
    sup_one_label=$("#sup_one_label");
    sup_two_label=$("#sup_two_label");
    sup_three_label=$("#sup_three_label");
    sup_four_label=$("#sup_four_label");

    rlab_info_box=$("#rlab_info_box");
    rlab_info_close=$("#rlab_info_close");
    rlab_info=$("#rlab_info");
    overdrive_label=$("#overdrive_label");
    overdrive_upgrade=$("#overdrive_upgrade");
    one_price_label=$("#one_price_label");
    two_price_label=$("#two_price_label");
    three_price_label=$("#three_price_label");
    four_price_label=$("#four_price_label");

    mc_info=$("#mc_info");
    mc_info_close=$("#mc_info_close");
    mc_info_box=$("#mc_info_box");
    animal6_components_multiplier_label=$("#animal6_components_multiplier_label");
    animal7_battery_charge_multiplier_label=$("#animal7_battery_charge_multiplier_label");
    animal2_magnetron_duration_label=$("#animal2_magnetron_duration_label");
    animal3_magnetron_multiplier_label=$("#animal3_magnetron_multiplier_label");
    animal8_radiator_boost_label=$("#animal8_radiator_boost_label");
    ac_all_label=$("#ac_all_label");
    animal1=$("#animal1");
    animal2=$("#animal2");
    animal3=$("#animal3");
    animal4=$("#animal4");
    animal5=$("#animal5");
    animal6=$("#animal6");
    animal7=$("#animal7");
    animal8=$("#animal8");

    lscanner_info_close=$("#lscanner_info_close");
    lscanner_info_box=$("#lscanner_info_box");
    lscanner_block=$("#lscanner_block");
    lscanner_title=$("#lscanner_title");
    lscanner_info=$("#lscanner_info");

    foundry_components_label=$("#foundry_components_label");
    foundry_components_cycle_upgrade=$("#foundry_components_cycle_upgrade");
    foundry_components_multiplier_label=$("#foundry_components_multiplier_label");
    furnace_screen=$("#furnace_screen");
    rank_description_label=$("#rank_description_label");
    pb_components_multiplier=$("#pb_components_multiplier");
    pb_components_multiplier_indicator=$("#pb_components_multiplier_indicator");

    rank_infobox_cancel=$("#rank_infobox_cancel");
    rank_infobox=$("#rank_infobox");
    engden_info=$("#engden_info");
    engden_info_box=$("#engden_info_box");
    engden_info_close=$("#engden_info_close");
    foundry_info_box=$("#foundry_info_box");
    foundry_info_close=$("#foundry_info_close");
    foundry_info=$("#foundry_info");
    ac_stock_label=$("#ac_stock_label");

    bonusboxblock_1=$("#bonusboxblock_1");
    bonusboxblock_2=$("#bonusboxblock_2");
    bonusboxblock_3=$("#bonusboxblock_3");
    bonusboxblock_4=$("#bonusboxblock_4");
    bonusboxblock_5=$("#bonusboxblock_5");
    bonusboxblock_6=$("#bonusboxblock_6");
    bonusboxblock_7=$("#bonusboxblock_7");
    bonusboxblock_8=$("#bonusboxblock_8");

    telescope=$("#telescope");

    bonusbox_text=$("#bonusbox_text");
    bonusbox=$(".bonusbox");

    auxiliary_lever1=$("#auxiliary_lever1");
    auxiliary_lever2=$("#auxiliary_lever2");
    auxiliary_effectiveness_label=$("#auxiliary_effectiveness_label");
    engden_title=$("#engden_title");
    engden_block=$("#engden_block");

    incorrectsave_infobox_cancel=$("#incorrectsave_infobox_cancel");
    incorrectsave_infobox=$("#incorrectsave_infobox");
    magicnumber_label=$("#magicnumber_label");
    rank_label=$("#rank_label");
    rank_block=$("#rank_block");
    magicnumber_block=$("#magicnumber_block");

    battery_info_close=$("#battery_info_close");
    battery_info_box=$("#battery_info_box");
    battery_info=$("#battery_info");
    magnetron_info_close=$("#magnetron_info_close");
    magnetron_info_box=$("#magnetron_info_box");
    magnetron_info=$("#magnetron_info");

    foundry_unlock_upgrade=$("#foundry_unlock_upgrade");
    foundry_block=$("#foundry_block");
    foundry_lock_block=$("#foundry_lock_block");

    magnetron_duration_upgrade=$("#magnetron_duration_upgrade");
    magnetron_multiplier_upgrade=$("#magnetron_multiplier_upgrade");
    magnetron_duration_label=$("#magnetron_duration_label");
    magnetron_multiplier_label=$("#magnetron_multiplier_label");
    magnetron_lock_block=$("#magnetron_lock_block");
    magnetron_block=$("#magnetron_block");
    magnetron_button=$("#magnetron_button");
    magnetron_unlock_upgrade=$("#magnetron_unlock_upgrade");

    charge_throughput_upgrade=$("#charge_throughput_upgrade");
    charge_throughput_label=$("#charge_throughput_label");
    battery_effectiveness_label=$("#battery_effectiveness_label");
    battery_charge_percentage_label=$("#battery_charge_percentage_label");
    battery_percent_up=$("#battery_percent_up");
    battery_percent_down=$("#battery_percent_down");
    battery_block=$("#battery_block");
    battery_lock_block=$("#battery_lock_block");
    battery_unlock_upgrade=$("#battery_unlock_upgrade");
    charge_limit_label=$("#charge_limit_label");
    charge_limit_upgrade=$("#charge_limit_upgrade");
    pb_battery=$("#pb_battery");
    pb_battery_indicator=$("#pb_battery_indicator");

    warp_magnetron_multiplier_upgrade=$("#warp_magnetron_multiplier_upgrade");
    warp_magnetron_duration_upgrade=$("#warp_magnetron_duration_upgrade");
    warp_magnetron_alerting_upgrade=$("#warp_magnetron_alerting_upgrade");
    warp_rank1_upgrade=$("#warp_rank1_upgrade");
    warp_rank2_upgrade=$("#warp_rank2_upgrade");
    warp_rank3_upgrade=$("#warp_rank3_upgrade");
    warp_rank4_upgrade=$("#warp_rank4_upgrade");
    warp_wallpaper_upgrade=$("#warp_wallpaper_upgrade");

    reboot_upgrade=$("#reboot_upgrade");
    ac_owned_label=$("#ac_owned_label");
    antimatter_block=$("#antimatter_block");
    g_electric=$("#g_electric");
    g_plasma=$("#g_plasma");
    g_nuclear=$("#g_nuclear");
    g_gravity=$("#g_gravity");
    import_save_button=$("#import_save_button");
    import_save_dump=$("#import_save_dump");
    gamesavedump=$("#gamesavedump");
    audio_toggle_one=$("#audio_toggle_one");
    audio_toggle_two=$("#audio_toggle_two");
    audio_toggle_three=$("#audio_toggle_three");
    audio_toggle_four=$("#audio_toggle_four");
    audio_toggle_allgen=$("#audio_toggle_allgen");
    audio_control_volume=$("#audio_control_volume");
    settings_cancel=$("#settings_cancel");
    settings_upgrade=$("#settings_upgrade");
    settings_infobox=$("#settings_infobox");
    manual_upgrade=$("#manual_upgrade");
    tillNextAntimatter_label=$("#tillNextAntimatter_label");
    pb_antimatter=$("#pb_antimatter");
    ac_label=$("#ac_label");
    antimatter_label=$("#antimatter_label");
    all_time_money_label=$("#all_time_money_label");
    total_money_label=$("#total_money_label");
    stats_infobox=$("#stats_infobox");
    stats_cancel=$("#stats_cancel");
    control_panel_tab=$("#control_panel_tab");
    factory_switch=$("#factory_switch");
    arrow_right=$("#arrow_right");
    arrow_left=$("#arrow_left");
    generator_tabs=$("#generator_tabs");
    prestige_infobox=$("#prestige_infobox");
    prestige_ok=$("#prestige_ok");
    prestige_cancel=$("#prestige_cancel");
    reset_cancel=$("#reset_cancel");
    reset_ok=$("#reset_ok");
    gameboard=$("#gameboard");
    reset_infobox=$("#reset_infobox");
    reset_upgrade=$("#reset_upgrade");
    save_timer_label=$("#save_timer_label");
    save_upgrade=$("#save_upgrade");

    prestige_upgrade=$("#prestige_upgrade");

    pb_one_effectiveness_indicator=$("#pb_one_effectiveness_indicator");
    pb_two_effectiveness_indicator=$("#pb_two_effectiveness_indicator");
    pb_three_effectiveness_indicator=$("#pb_three_effectiveness_indicator");
    pb_four_effectiveness_indicator=$("#pb_four_effectiveness_indicator");
    pb_one_supply_indicator=$("#pb_one_supply_indicator");
    pb_two_supply_indicator=$("#pb_two_supply_indicator");
    pb_three_supply_indicator=$("#pb_three_supply_indicator");
    pb_four_supply_indicator=$("#pb_four_supply_indicator");
    pb_money_indicator=$("#pb_money_indicator");
    pb_antimatter_indicator=$("#pb_antimatter_indicator");
    color_block=$(".color_block");
    audio_toggle=$("#audio_toggle");

    one_name_label=$("#one_name_label");
    two_name_label=$("#two_name_label");
    three_name_label=$("#three_name_label");
    four_name_label=$("#four_name_label");

    one_generation_label=$("#one_generation_label");
    two_generation_label=$("#two_generation_label");
    three_generation_label=$("#three_generation_label");
    four_generation_label=$("#four_generation_label");

    one_upgrade_generation=$("#one_upgrade_generation");
    two_upgrade_generation=$("#two_upgrade_generation");
    three_upgrade_generation=$("#three_upgrade_generation");
    four_upgrade_generation=$("#four_upgrade_generation");

    money_limit_label=$("#money_limit_label");
    one_effectiveness_label=$("#one_effectiveness_label");
    two_effectiveness_label=$("#two_effectiveness_label");
    three_effectiveness_label=$("#three_effectiveness_label");
    four_effectiveness_label=$("#four_effectiveness_label");

    one_ratio_label=$("#one_ratio_label");
    two_ratio_label=$("#two_ratio_label");
    three_ratio_label=$("#three_ratio_label");
    four_ratio_label=$("#four_ratio_label");

    one_upgrade_effectiveness=$("#one_upgrade_effectiveness");
    pb_one_upgrade_effectiveness=$("#pb_one_upgrade_effectiveness");
    pb_one_upgrade_supply_limit=$("#pb_one_upgrade_supply_limit");
    one_upgrade_supply_limit=$("#one_upgrade_supply_limit");

    two_upgrade_effectiveness=$("#two_upgrade_effectiveness");
    pb_two_upgrade_effectiveness=$("#pb_two_upgrade_effectiveness");
    pb_two_upgrade_supply_limit=$("#pb_two_upgrade_supply_limit");
    two_upgrade_supply_limit=$("#two_upgrade_supply_limit");

    three_upgrade_effectiveness=$("#three_upgrade_effectiveness");
    pb_three_upgrade_effectiveness=$("#pb_three_upgrade_effectiveness");
    pb_three_upgrade_supply_limit=$("#pb_three_upgrade_supply_limit");
    three_upgrade_supply_limit=$("#three_upgrade_supply_limit");

    four_upgrade_effectiveness=$("#four_upgrade_effectiveness");
    pb_four_upgrade_effectiveness=$("#pb_four_upgrade_effectiveness");
    pb_four_upgrade_supply_limit=$("#pb_four_upgrade_supply_limit");
    four_upgrade_supply_limit=$("#four_upgrade_supply_limit");

    two_tab_contents=$("#two_tab_contents");
    one_tab_contents=$("#one_tab_contents");
    three_tab_contents=$("#three_tab_contents");
    four_tab_contents=$("#four_tab_contents");

    money_limit_upgrade=$("#money_limit_upgrade");

    pb_money=$("#pb_money");
    four_tab=$("#four_tab");
    three_tab=$("#three_tab");
    two_tab=$("#two_tab");
    one_tab=$("#one_tab");
    one_supply_label=$("#one_supply_label");
    two_supply_label=$("#two_supply_label");
    three_supply_label=$("#three_supply_label");
    four_supply_label=$("#four_supply_label");
    button_one=$("#button_one");
    button_two=$("#button_two");
    button_three=$("#button_three");
    button_four=$("#button_four");
    prestige_board=$("#prestige_board");
    all=$("#all");


    document.title = "Machinery ["+version+"2]";
          console.log("Machinery ["+version+"2]");
          console.log("created by Louigi Verona");
          console.log("https://louigiverona.com/?page=about");
    Howler.volume(audio_volume);//default volume

    if(localStorage.getItem(savefile_name)){
      LoadGame();
    }else{
      Init();
      titlecard.show();
    }

    //testing
    /*
    closeWindows();
    all.hide();
    prestigeInit();
    reboot_backtogame.hide();
    reboot_upgrade.show();
    prestige_board.show();
    */
    //testing

    $("html").keydown(function( event ) {
			  switch (event.key){
          case "q":
            if(qkeycard==1){
              moneyCalc(money_limit-money);
              InventoryUpdate();
            }else if(qkeycard==2){
              all_time_positron_cubes++;
              pc_positron_cubes_label.html('&#8984;'+numT(all_time_positron_cubes));
              magicnumber_label.text('['+numT(all_time_positron_cubes)+']');
            }
					break;
					case "w":
            //for testing
            console.log(warp_challenge1_flag);
            console.log(warp_challenge2_flag);
            console.log(warp_challenge3_flag);
            console.log(warp_challenge4_flag);





					break;
          case "d":
            if(prestige_flag==0){
              debug_mode++;
            }
            if(debug_mode==5){
              PlayAudio(10);
              qkeycard=0;debug_qkeycard_upgrade.attr("class", "button3gray");
              debug_mode_panel.show();
            }
          break;
					case "r":

              PlayAudio(1);
              restartGenerators();
					break;
					case "u":
            //toggle auto-buy



            if(chief_check==0){

              PlayAudio(10);

              if(buymax_toggle_flag==0 && rlab_autobuy_toggle_flag==0 && night_shift==0){

                if(warp_panel2_upgrade_flag>0){
                  buymax_toggle_flag=1;
                  buymax_toggle.html('[<span class="purple">auto</span>]');
                }

                if(warp_panel3_upgrade_flag>0){
                  rlab_autobuy_toggle_flag=1;
                  rlab_autobuy_toggle.html('[<span class="purple">auto</span>]');
                }

                if(engden_state==1){
                  night_shift=1;
                  night_shift_toggle.attr("class", "engden_on").text("ON");
                  if(money==money_limit){restartGenerators();}
                  InventoryUpdate();
                }

              }else{

                buymax_toggle_flag=0;
                buymax_toggle.html('[auto]');

                rlab_autobuy_toggle_flag=0;
                rlab_autobuy_toggle.text('[auto]');

                night_shift=0;
                night_shift_toggle.attr("class", "engden_off").text("OFF");

              }
            }else{
              PlayAudio(10);
              ccSwitch();
              chief_warp_check=0;
              chief_warp_check_toggle.removeClass('button3blue').addClass('button3gray').text("OFF");
            }

					break;
				  }
			});

    //TABS
    color_block.click(function(){

      PlayAudio(10);

      $('.color_block').css("background-color","#1a1a1a");
      $('.color_block').css("color","#999");
      one_tab_contents.hide();
      two_tab_contents.hide();
      three_tab_contents.hide();
      four_tab_contents.hide();

      var id = $(this).attr('id');

      switch(id){
        case 'one_tab':
          one_tab_contents.show();active_tab_flag=1;
          one_tab.css("background-color","#30b8d0");
          one_tab.css("color","#1a1a1a");
          pbRefreshOne();
        break;
        case 'two_tab':
          two_tab_contents.show();active_tab_flag=2;
          two_tab.css("background-color","#dbd45f");
          two_tab.css("color","#1a1a1a");
          pbRefreshTwo();
        break;
        case 'three_tab':
          three_tab_contents.show();active_tab_flag=3;
          three_tab.css("background-color","#db3356");
          three_tab.css("color","#1a1a1a");
          pbRefreshThree();
        break;
        case 'four_tab':
          four_tab_contents.show();active_tab_flag=4;
          four_tab.css("background-color","#9f9f9f");
          four_tab.css("color","#1a1a1a");
          pbRefreshFour();
        break;
      }

      storeState();
      });

    audio_toggle.click(function(){
      if(audio_mute==0){
        PlayAudio(1);//has to be here in order to be played
        audio_mute=1;
        audio_toggle.text("Unmute audio");
        button3Red(audio_toggle);
      }else{
        audio_mute=0;
        PlayAudio(1);//has to be here in order to be played
        audio_toggle.text("Mute audio");
        button3Green(audio_toggle);
      }
    });
    audio_toggle_one.click(function(){
              PlayAudio(1);
      if(audio_mute_one==0){
        audio_mute_one=1;
        audio_toggle_one.text("Unmute Electric");
        button3Red(audio_toggle_one);
      }else{
        audio_mute_one=0;
        audio_toggle_one.text("Mute Electric");
        button3Green(audio_toggle_one);
      }
    });
    audio_toggle_two.click(function(){
              PlayAudio(1);
      if(audio_mute_two==0){
        audio_mute_two=1;
        audio_toggle_two.text("Unmute Plasma");
        button3Red(audio_toggle_two);
      }else{
        audio_mute_two=0;
        audio_toggle_two.text("Mute Plasma");
        button3Green(audio_toggle_two);
      }
    });
    audio_toggle_three.click(function(){
              PlayAudio(1);
      if(audio_mute_three==0){
        audio_mute_three=1;
        audio_toggle_three.text("Unmute Nuclear");
        button3Red(audio_toggle_three);
      }else{
        audio_mute_three=0;
        audio_toggle_three.text("Mute Nuclear");
        button3Green(audio_toggle_three);
      }
    });
    audio_toggle_four.click(function(){
              PlayAudio(1);
      if(audio_mute_four==0){
        audio_mute_four=1;
        audio_toggle_four.text("Unmute Gravity");
        button3Red(audio_toggle_four);
      }else{
        audio_mute_four=0;
        audio_toggle_four.text("Mute Gravity");
        button3Green(audio_toggle_four);
      }
    });
    audio_toggle_allgen.click(function(){
              PlayAudio(1);
      if(audio_mute_allgen==0){
        audio_mute_allgen=1;
        audio_mute_one=1;
        audio_mute_two=1;
        audio_mute_three=1;
        audio_mute_four=1;
        audio_toggle_one.text("Unmute Electric");
        audio_toggle_two.text("Unmute Plasma");
        audio_toggle_three.text("Unmute Nuclear");
        audio_toggle_four.text("Unmute Gravity");
        audio_toggle_allgen.text("Unmute All");
        button3Red(audio_toggle_one);
        button3Red(audio_toggle_two);
        button3Red(audio_toggle_three);
        button3Red(audio_toggle_four);
        button3Red(audio_toggle_allgen);
      }else{
        audio_mute_allgen=0;
        audio_mute_one=0;
        audio_mute_two=0;
        audio_mute_three=0;
        audio_mute_four=0;
        audio_toggle_one.text("Mute Electric");
        audio_toggle_two.text("Mute Plasma");
        audio_toggle_three.text("Mute Nuclear");
        audio_toggle_four.text("Mute Gravity");
        audio_toggle_allgen.text("Mute All");
        button3Green(audio_toggle_one);
        button3Green(audio_toggle_two);
        button3Green(audio_toggle_three);
        button3Green(audio_toggle_four);
        button3Green(audio_toggle_allgen);
      }
    });
    audio_control_volume.mousemove(function(){
        audio_volume=audio_control_volume.val();
        Howler.volume(audio_volume);
    });

    toggle_scientific.click(function(){
      PlayAudio(1);
      if(scientific_ui==0){
        scientific_ui=1;
        toggle_scientific.attr("class", "button3blue");
      }else{
        scientific_ui=0;
        toggle_scientific.attr("class", "button3");
      }
    });

    copy_save_button.click(function(){
      PlayAudio(1);

      var copySave = gamesavedump.text();
      navigator.clipboard.writeText(copySave);

      save_copied.text("Save copied!");
      setTimeout( function () { save_copied.text(''); }, 2000 );

    });

    debug_qkeycard_upgrade.click(function(){
      PlayAudio(1);
      if(qkeycard!=1){
        qkeycard=1;
        debug_qkeycard_upgrade.attr("class", "button3blue");
        debug_qkeycard2_upgrade.attr("class", "button3gray");
      }else{
        qkeycard=0;
        debug_qkeycard_upgrade.attr("class", "button3gray");
      }
    });
    debug_qkeycard2_upgrade.click(function(){
      PlayAudio(1);
      if(qkeycard!=2){
        qkeycard=2;
        debug_qkeycard2_upgrade.attr("class", "button3blue");
        debug_qkeycard_upgrade.attr("class", "button3gray");
      }else{
        qkeycard=0;
        debug_qkeycard_upgrade.attr("class", "button3gray");
      }
    });
    debug_save_upgrade.click(function(){
      PlayAudio(2);
      SaveGame();
    });
    debug_close_upgrade.click(function(){
      PlayAudio(10);
      debug_mode=0;
      qkeycard=0;
      debug_mode_panel.hide();
    });




    save_upgrade.click(function(){
      PlayAudio(2);
      save_sec=120;
      button3Disable(save_upgrade);
      SaveGame();
    });

    settings_upgrade.click(function(){
      PlayAudio(10);
      if(settings_window_flag==0){
        closeWindows();
        settings_infobox.show();
        settings_window_flag=1;
        windowScroll();
      }else{
        settings_infobox.hide();
        settings_window_flag=0;
      }
    });
    settings_cancel.click(function(){
      PlayAudio(10);
      settings_infobox.hide();
      settings_window_flag=0;
    });

    incorrectsave_infobox_cancel.click(function(){
      PlayAudio(1);
      incorrectsave_infobox.hide();
    });

    titlecard.click(function(){
      PlayAudio(10);
      titlecard.hide();
    });

    warp_view_warning.click(function(){
      PlayAudio(10);
      warp_view_warning.hide();
    });

    reset_upgrade.click(function(){
      PlayAudio(2);
      if(reset_window_flag==0){
        closeWindows();
        windowScroll();
        reset_infobox.show();
        reset_window_flag=1;
      }else{
        reset_infobox.hide();
        reset_window_flag=0;
      }

    });
    reset_cancel.click(function(){
      PlayAudio(2);
      reset_infobox.hide();
      reset_window_flag=0;
    });
    reset_ok.click(function(){
      PlayAudio(2);
      clearInterval(save_timer);
      clearInterval(one_interval);
      clearInterval(two_interval);
      clearInterval(three_interval);
      clearInterval(four_interval);
      localStorage.removeItem(savefile_name);
      reset_infobox.text("Game data reset. Reload page.");
      all.hide();
    });

    antimatter_block.click(function(){

      PlayAudio(10);

      if(stats_window_flag==0){
        var tillNextAntimatter_value=nextAntimatterCost - all_time_money;
          if(tillNextAntimatter_value<0){tillNextAntimatter_value=0;}
          tillNextAntimatter_label.text("⌬" + numT( tillNextAntimatter_value ) );
        all_time_money_label.text("⌬" + numT(all_time_money));
        total_money_label.text("⌬" + numT(total_money));
        ac_stock_label.text( numT( antimatter_cubes-antimatter_cubes_spent ) );

        //tillNextAntimatter_label.text("⌬" + numT( nextAntimatterCost - all_time_money ) );

        closeWindows();
        stats_infobox.show();
        stats_window_flag=1;
        windowScroll();
      }else{
        stats_infobox.hide();
        stats_window_flag=0;
      }

    });
    stats_cancel.click(function(){
      PlayAudio(10);
      stats_infobox.hide();
      stats_window_flag=0;
    });

    rank_block.click(function(){/*rank block*/

      PlayAudio(10);

      if(rankinfo_window_flag==0){

        var rank;

        if(engden_state==0){rank=0;}//operator
        if(engden_state==1){rank=1;}//engineer
        if(lscanner_state==1){rank=2;}//floor admin
        if(chief==1){rank=3;}//chief engineer

        switch(rank){
          case 0: rank_description_label.html("You are an <b>operator</b>. You have basic knowledge of how machines work, but you do feel a strong kinship with everything non-organic. You even have a non-organic isopod as a pet, but it's your little secret.");
          break;
          case 1: rank_description_label.html("You are an <b>engineer</b>. You have a deep understanding of machines and know how to tweak them to make seemingly impossible things happen. You are part of a noble profession and are proud to speak the language of non-organics.");
          break;
          case 2: rank_description_label.html("You are a <b>floor administrator</b>. You are now part of a very special engineering tribe that keeps the quickly evolving non-organic jungle at bay. Some things that you've seen were not meant for human eyes.");
          break;
          case 3: rank_description_label.html("You are <b>chief engineer</b>. You are a fatherly figure to the engineers and floor administrators on your team. You provide wisdom, experience and moral support. A lot of the things you say become aphorisms that are passed down to new generations.");
          break;
        }


        rank_upgrade1_descr.html('<span class="sm">Increases the speed of everything by 400%<br><br></span>');
        rank_upgrade2_descr.html('<span class="sm">Boosts Antimatter Amplifier by x5<br><br></span>');
        rank_upgrade3_descr.html('<span class="sm">Boosts Antimatter Amplifier by x10<br><br></span>');

        challenge_reward2_descr.html('<span class="sm">Keeps couplings aligned<br><br></span>');

        rank_qm1_descr.html('<span class="sm">Foundry stays at working temperature. Components per cycle are increased by x1M<br><br></span>');
        rank_qm2_descr.html('<span class="sm">Unlocks Lifeforms Scanner from the start<br><br></span>');
        rank_qm5_descr.html('<span class="sm">Boosts positron emission by x10k<br><br></span>');
        rank_qm6_descr.html('<span class="sm">A machine to provide energy boosts<br><br></span>');

        if(warp_challenge3_flag==2){
          rank_qm4_title.html('Solar Amplifier II');
          rank_qm4_descr.html('<span class="sm">Boosts Antimatter Amplifier by x3 and speed by 200%<br><br></span>');
        }else{
          rank_qm4_title.html('Solar Amplifier');
          rank_qm4_descr.html('<span class="sm">Boosts Antimatter Amplifier by x2<br><br></span>');
        }

        if(warp_challenge4_flag==2){
          rank_qm3_title.html('Zoo Keeper II');
          rank_qm3_descr.html('<span class="sm">Get 5 lifeforms from every Lifeform upgrade<br><br></span>');
        }else{
          rank_qm3_title.html('Zoo Keeper');
          rank_qm3_descr.html('<span class="sm">Get 2 lifeforms from every Lifeform upgrade<br><br></span>');
        }

        sysmon_am_radiation_title.html('Spillover Multiplier: <b>x'+numT(am_radiation_multiplier)+'</b>');
        sysmon_am_radiation_descr.html('<span class="sm">In warpless mode, every 100 antimatter increments the multiplier<br><br></span>');
        if(am_radiation_multiplier>1){system_monitoring.show();}else{system_monitoring.hide();}


        if(time_fundamental==0.25){
          ppa_upgrade1_rank_block.removeClass('inactive').addClass('active');
          rank_upgrade1_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          ppa_upgrade1_rank_block.removeClass('active').addClass('inactive');
          rank_upgrade1_plank.removeClass('blue').addClass('red').text('[inactive]');
        }

        if(powerplants_multiplier>=5){
          ppa_upgrade2_rank_block.removeClass('inactive').addClass('active');
          rank_upgrade2_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          ppa_upgrade2_rank_block.removeClass('active').addClass('inactive');
          rank_upgrade2_plank.removeClass('blue').addClass('red').text('[inactive]');
        }

        if(powerplants_multiplier>=50){
          ppa_upgrade3_rank_block.removeClass('inactive').addClass('active');
          rank_upgrade3_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          ppa_upgrade3_rank_block.removeClass('active').addClass('inactive');
          rank_upgrade3_plank.removeClass('blue').addClass('red').text('[inactive]');
        }

        if(warp_challenge2_flag==2){/*couplings stabilizer*/
          challenge_rewards.show();
          challenge_reward2_block.removeClass('inactive').addClass('active');
          challenge_reward2_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          challenge_rewards.hide();
          challenge_reward2_block.removeClass('active').addClass('inactive');
          challenge_reward2_plank.removeClass('blue').addClass('red').text('[inactive]');
        }


        if(countQUF(quantum_upgrade_flag)>0){//when there are quantum upgrades
          qm_rewards.show();
        }else{qm_rewards.hide();}

        if(quantum_upgrade_flag[0]==1){
          qm1_rank_block.removeClass('inactive2').addClass('active2');
          rank_qm1_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          qm1_rank_block.removeClass('active2').addClass('inactive2');
          rank_qm1_plank.removeClass('blue').addClass('red').text('[inactive]');
        }
        if(quantum_upgrade_flag[1]==1){
          qm2_rank_block.removeClass('inactive2').addClass('active2');
          rank_qm2_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          qm2_rank_block.removeClass('active2').addClass('inactive2');
          rank_qm2_plank.removeClass('blue').addClass('red').text('[inactive]');
        }
        if(quantum_upgrade_flag[2]==1){
          qm3_rank_block.removeClass('inactive2').addClass('active2');
          rank_qm3_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          qm3_rank_block.removeClass('active2').addClass('inactive2');
          rank_qm3_plank.removeClass('blue').addClass('red').text('[inactive]');
        }
        if(quantum_upgrade_flag[3]==1){
          qm4_rank_block.removeClass('inactive2').addClass('active2');
          rank_qm4_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          qm4_rank_block.removeClass('active2').addClass('inactive2');
          rank_qm4_plank.removeClass('blue').addClass('red').text('[inactive]');
        }
        if(quantum_upgrade_flag[4]==1){
          qm5_rank_block.removeClass('inactive2').addClass('active2');
          rank_qm5_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          qm5_rank_block.removeClass('active2').addClass('inactive2');
          rank_qm5_plank.removeClass('blue').addClass('red').text('[inactive]');
        }
        if(quantum_upgrade_flag[5]==1){
          qm6_rank_block.removeClass('inactive2').addClass('active2');
          rank_qm6_plank.removeClass('red').addClass('blue').text('[active]');
        }else{
          qm6_rank_block.removeClass('active2').addClass('inactive2');
          rank_qm6_plank.removeClass('blue').addClass('red').text('[inactive]');
        }

        //start off with details hidden
        rank_block_show_details_flag=0;
        rank_block_show_details.text("Show details");
        sm_rank_desc.hide();

        closeWindows();
        rank_infobox.show();
        rankinfo_window_flag=1;
        windowScroll();
      }else{
        rank_infobox.hide();
        rankinfo_window_flag=0;
      }

    });
    rank_infobox_cancel.click(function(){
      PlayAudio(10);
      rank_infobox.hide();
      rankinfo_window_flag=0;
    });
    rank_block_show_details.click(function(){
      PlayAudio(10);

      if(rank_block_show_details_flag==0){
        rank_block_show_details_flag=1;
        sm_rank_desc.show();
        rank_block_show_details.text("Hide details");
      }else{
        rank_block_show_details_flag=0;
        sm_rank_desc.hide();
        rank_block_show_details.text("Show details");
      }


    });

    magicnumber_block.click(function(){

      PlayAudio(10);

      if(magicnumber_window_flag==0){

        closeWindows();
        magicnumber_infobox.show();
        magicnumber_window_flag=1;
        windowScroll();

        positron_cubes_owned_label.text('[ '+numT(all_time_positron_cubes)+' ]');
        power_plants_built_label.text('[ '+numT(powerplants_amount)+' ]');

        if(all_time_positron_cubes<5){
          establish_powerplant_upgrade.attr("class", "disabled9");
        }else{establish_powerplant_upgrade.attr("class", "button9");}

      }else{
        magicnumber_infobox.hide();
        magicnumber_window_flag=0;
      }

    });
    magicnumber_infobox_cancel.click(function(){
      PlayAudio(10);
      magicnumber_infobox.hide();
      magicnumber_window_flag=0;
    });

    manual_upgrade.click(function(){
      PlayAudio(2);

    });

    import_save_button.click(function(){

      if(import_save_dump.text().length<=0){return;}

      PlayAudio(2);

      localStorage.setItem(savefile_name, import_save_dump.text());
      import_save_dump.text('');
      clearInterval(save_timer);//stop the save timer
      clearInterval(one_interval);//stop all generators
      clearInterval(two_interval);
      clearInterval(three_interval);
      clearInterval(four_interval);
      closeWindows();
      windowScroll();
      all.hide();

      //checking save

      let gameData=localStorage.getItem(savefile_name);
      gamesavedump.text(gameData);

      if(gameData) {
        try {
            gameData = LZString.decompressFromBase64(gameData);
            if(gameData===null){gameData="invalid save";}
            gameData = JSON.parse(gameData);
        } catch(e) {
            console.log(e);
            incorrectsave_infobox.show().html("The save is invalid.<br><br>Make sure you copied the save correctly. If you don't have a save you can use, you can reset the game, by wiping the save and starting from scratch (see Settings below)");
            all.hide();
            return;
        }
      }

      if(version!=gameData.player[6]){
        incorrectsave_infobox.show().html("A save from a previous version detected. It's not compatible with <span class='red'>Machinery ["+version+"]</span><br><br>Please, wipe save to start from scratch or import a save that matches this game version (see Settings below)");
        clearInterval(save_timer);button3Disable(save_upgrade);save_timer=null;
        all.hide();
        return;
      }


      //show success
      reset_infobox.show();
      reset_window_flag=1;

      reset_infobox.text("Save successfully imported. Reload page.");


    });

    //INFOs
    battery_info.click(function(){

      $(battery_info_box).show();
      PlayAudio(2);
    });
    battery_info_close.click(function(){

      $(battery_info_box).hide();
      PlayAudio(2);

    });

    magnetron_info.click(function(){

      $(magnetron_info_box).show();
      PlayAudio(2);

    });
    magnetron_info_close.click(function(){

      $(magnetron_info_box).hide();
      PlayAudio(2);

    });

    foundry_info.click(function(){

      $(foundry_info_box).show();
      PlayAudio(2);

    });
    foundry_info_close.click(function(){

      $(foundry_info_box).hide();
      PlayAudio(2);

    });

    general_info.click(function(){

      $(general_info_box).show();
      PlayAudio(2);

    });
    general_info_close.click(function(){

      $(general_info_box).hide();
      PlayAudio(2);

    });

    engden_info.click(function(){

      $(engden_info_box).show();
      PlayAudio(2);

    });
    engden_info_close.click(function(){

      $(engden_info_box).hide();
      PlayAudio(2);

    });

    rlab_info.click(function(){

      $(rlab_info_box).show();
      PlayAudio(2);

    });
    rlab_info_close.click(function(){

      $(rlab_info_box).hide();
      PlayAudio(2);

    });

    lscanner_info.click(function(){

      $(lscanner_info_box).show();
      PlayAudio(2);

    });
    lscanner_info_close.click(function(){

      $(lscanner_info_box).hide();
      PlayAudio(2);

    });

    radiator_info.click(function(){

      $(radiator_info_box).show();
      PlayAudio(2);

    });
    radiator_info_close.click(function(){

      $(radiator_info_box).hide();
      PlayAudio(2);

    });

    pc_info.click(function(){

      $(pc_info_box).show();
      PlayAudio(2);

    });
    pc_info_close.click(function(){

      $(pc_info_box).hide();
      PlayAudio(2);

    });

    chief_cc_info.click(function(){

      $(chief_cc_info_box).show();
      PlayAudio(2);

    });
    chief_cc_info_close.click(function(){

      $(chief_cc_info_box).hide();
      PlayAudio(2);

    });

    gambling_info.click(function(){

      $(gambling_info_box).show();
      PlayAudio(2);

    });
    gambling_info_close.click(function(){

      $(gambling_info_box).hide();
      PlayAudio(2);

    });

    //research lab item
    bonusbox.click(function(){

      PlayAudio(8);

      if(money==money_limit){restartGenerators();}

      //get id of element
      const id = $(this).attr('id').split('_');
      //console.log(id[1]-1);

      bbCalc(id[1]-1);

      bbUI();

      });

    //PRESTIGE
    prestige_upgrade.click(function(){

      PlayAudio(2);
      if(prestige_window_flag==0){
      closeWindows();
      prestige_infobox.show();
      windowScroll();
      ac_label.html( '<span class="gray">' + numT( antimatter_cubes-antimatter_cubes_spent ) + ' + </span>' + numT( antimatter ) + '<span class="gray"> = ' + numT(antimatter_cubes-antimatter_cubes_spent + antimatter) + '</span>' );

      if(antimatter_cubes==0){//before first warp
        if(antimatter<2){am_label.html( "x1 <span class='gray'>(minimum x2 for any effect)</span>" );}else{
          am_label.text( "x" + numT( antimatter ));
        }
      }else{
        var am_text;
        if(antimatter==0){am_text='0';}else{am_text='x'+numT(antimatter);}
        am_label.html( "<span class='gray'>x" + numT(prestige_multiplier) + " + </span>" + am_text + '<span class="gray"> = ' + numT(prestige_multiplier+antimatter) + '</span>' );
      }




      prestige_window_flag=1;
      }else{
      prestige_window_flag=0;
      prestige_infobox.hide();
      }
    });
    prestige_cancel.click(function(){
      PlayAudio(2);
      prestige_infobox.hide();
      prestige_window_flag=0;
    });
    prestige_inspect.click(function(){
      PlayAudio(2);

      closeWindows();
      all.hide();

      prestigeInit();
      reboot_backtogame.show();
      reboot_upgrade.hide();
      prestige_board.show();
    });
    reboot_backtogame.click(function(){
      PlayAudio(2);
      prestige_board.hide();
      all.show();
    });
    prestige_ok.click(function(){
      PlayAudio(2);
      prestigeOk();
    });
    reboot_upgrade.click(function(){
      PlayAudio(2);
      rebootOk();
    });

        warp_panel1_upgrade.click(function(){
          if(prestige_flag==0){return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_panel1_upgrade_flag=1;
              sup_one_label.show();
              sup_two_label.show();
              sup_three_label.show();
              sup_four_label.show();

            prestigeState();

          }else{PlayAudio(11);}



        });//on by default
        warp_panel2_upgrade.click(function(){
          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

          PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_panel2_upgrade_flag=1;
              buymax_toggle.show();
              buymax_toggle_flag=1;
              buymax_toggle.html('[<span class="purple">auto</span>]');

              //this is done to override the value of the autobuy_purse, which is used to properly stop generators at warp. But the side effect is that when autobuy hasn't been activated yet, the values of autobuy_purse are all 0s and they override the flags in reboot_upgrade, which leads to inconsistent behavior
              autobuy_purse[0]=buymax_toggle_flag;

            prestigeState();

          }else{PlayAudio(11);}

        });
        warp_panel3_upgrade.click(function(){
          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_panel3_upgrade_flag=1;
              rlab_autobuy_toggle.show();
              rlab_autobuy_toggle_flag=1;
              rlab_autobuy_toggle.html('[<span class="purple">auto</span>]');
              autobuy_purse[1]=rlab_autobuy_toggle_flag;

            prestigeState();

          }else{PlayAudio(11);}

        });
        warp_panel4_upgrade.click(function(){
          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

          PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_panel4_upgrade_flag=1;
              machines_buymax_toggle.show();
              machines_buymax_toggle_flag=1;
              machines_buymax_toggle.html('[1/<span class="purple">max</span>]');

            prestigeState();

          }else{PlayAudio(11);}

        });

        warp_magnetron_duration_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_max_magnetron_duration=120;

            prestigeState();

          }else{PlayAudio(11);}

        });
        warp_magnetron_multiplier_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_max_magnetron_multiplier=20;

            prestigeState();

          }else{PlayAudio(11);}

        });
        warp_magnetron_alerting_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_magnetron_alerting=1;

            prestigeState();

          }else{PlayAudio(11);}

        });

        warp_rank1_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            engden_state=1;//this defines the player being an Engineer

            night_shift=1;
            night_shift_toggle.attr("class", "engden_on").text("ON");
            autobuy_purse[2]=night_shift;

            prestigeState();

          }else{PlayAudio(11);}

        });
        warp_rank2_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            lscanner_state=1;//this defines the player being a Floor Admin
            ogr=10;//this is also set in prestige_ok event
            recency=0;//and this is set here, so that the first time lscanner is activated, lifeforms are always present regardless of the ratio of antimatter earned in the previous play

            prestigeState();

          }else{PlayAudio(11);}

        });
        warp_rank1_training1_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_rank1_training1_flag=1;

            prestigeState();

          }else{PlayAudio(11);}

        });//not currently used
        warp_rank2_training1_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_rank2_training1_flag=1;

            prestigeState();

          }else{PlayAudio(11);}

        });
        warp_rank2_training2_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          var ac_owned=antimatter_cubes-antimatter_cubes_spent;

          if(ac_owned-warp_price>=0){

            PlayAudio(2);

            antimatter_cubes_spent+=warp_price;
            warp_price*=warp_price_rate;

            warp_rank2_training2_flag=1;

            prestigeState();

          }else{PlayAudio(11);}

        });

        //Primal Grind, Sharpshooter, Positrons, Gen X
        warp_challenge1_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}



          PlayAudio(2);
          warp_challenge1_flag=2;

          prestigeState();

        });
        warp_challenge2_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(2);
          warp_challenge2_flag=2;

          prestigeState();

        });
        warp_challenge3_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(2);
          warp_challenge3_flag=2;

          prestigeState();

        });
        warp_challenge4_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(2);
          warp_challenge4_flag=2;

          prestigeState();

        });
        buff_challenge1_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(2);
          buff_challenge1_flag=2;

          prestigeState();

        });

        quantum_wipe_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(8);

          if(countQUF(quf_temp_bag)==0){warp_qm_warning.show();return;}
          else{warp_qm_warning.hide();}

          warp_qm_confirm.show();

        });
        warp_qm_warning_close.click(function(){

          PlayAudio(10);

          warp_qm_warning.hide();

        });
        warp_qm_confirm_cancel.click(function(){

          PlayAudio(10);

          warp_qm_confirm.hide();

        });
        warp_qm_confirm_ok.click(function(){/*quantum wipe!*/

          //setting the actual quf array
          quantum_upgrade_flag=quf_temp_bag;

          //this is a warpless challenge and when we quantum wipe, we reset it in case it was failed
          if(buff_challenge1_flag==3){buff_challenge1_flag=0;}

          PlayAudio(10);

          prestige_board.hide();
          all.show();

          windowScroll();

          ppaReset();
          resetPrestige();
          Init();

        });


        warp_qm1_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(10);
          warp_qm_confirm.hide();

          if(quf_temp_bag[0]==0 && countQUF(quf_temp_bag)<3){
            quf_temp_bag[0]=1;
            warp_qm1_upgrade.removeClass('item3').addClass('item3_selected');
          }else{
            quf_temp_bag[0]=0;
            warp_qm1_upgrade.removeClass("item3_selected").addClass("item3");
          }
        });
        warp_qm2_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(10);
          warp_qm_confirm.hide();

          if(quf_temp_bag[1]==0 && countQUF(quf_temp_bag)<3){
            quf_temp_bag[1]=1;
            warp_qm2_upgrade.removeClass('item3').addClass('item3_selected');
          }else{
            quf_temp_bag[1]=0;
            warp_qm2_upgrade.removeClass("item3_selected").addClass("item3");
          }

        });
        warp_qm3_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(10);
          warp_qm_confirm.hide();

          if(quf_temp_bag[2]==0 && countQUF(quf_temp_bag)<3){
            quf_temp_bag[2]=1;
            warp_qm3_upgrade.removeClass('item3').addClass('item3_selected');
          }else{
            quf_temp_bag[2]=0;
            warp_qm3_upgrade.removeClass("item3_selected").addClass("item3");
          }

        });
        warp_qm4_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(10);
          warp_qm_confirm.hide();

          if(quf_temp_bag[3]==0 && countQUF(quf_temp_bag)<3){
            quf_temp_bag[3]=1;
            warp_qm4_upgrade.removeClass('item3').addClass('item3_selected');
          }else{
            quf_temp_bag[3]=0;
            warp_qm4_upgrade.removeClass("item3_selected").addClass("item3");
          }

        });
        warp_qm5_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(10);
          warp_qm_confirm.hide();

          if(quf_temp_bag[4]==0 && countQUF(quf_temp_bag)<3){
            quf_temp_bag[4]=1;
            warp_qm5_upgrade.removeClass('item3').addClass('item3_selected');
          }else{
            quf_temp_bag[4]=0;
            warp_qm5_upgrade.removeClass("item3_selected").addClass("item3");
          }

        });
        warp_qm6_upgrade.click(function(){

          if(prestige_flag==0){warpViewWarning();return;}

          PlayAudio(10);
          warp_qm_confirm.hide();

          if(quf_temp_bag[5]==0 && countQUF(quf_temp_bag)<3){
            quf_temp_bag[5]=1;
            warp_qm6_upgrade.removeClass('item3').addClass('item3_selected');
          }else{
            quf_temp_bag[5]=0;
            warp_qm6_upgrade.removeClass("item3_selected").addClass("item3");
          }

        });

        //PRESTIGE 2
        establish_powerplant_upgrade.click(function(){//-----------establish power plant

          if(all_time_positron_cubes-5<0){PlayAudio(11);return;}

          PlayAudio(2);

          //ading a power plant
          if(powerplants_amount<5){
            powerplants_amount++;
            all_time_positron_cubes-=5;
          }

          pc_positron_cubes_label.html('&#8984;'+numT(all_time_positron_cubes));
          magicnumber_label.text('['+numT(all_time_positron_cubes)+']');

          //LOOPS
          clearInterval(save_timer);button3Disable(save_upgrade);save_timer=null;
          clearInterval(telescope_timer);telescope_timer=null;//stop the telescope
          if(magnetron_state==3){magnetronShutdown();}
          clearInterval(magnetron_interval);magnetron_interval=null;//stop the magnetron
          clearInterval(furnace_cooling_timer);furnace_cooling_timer=null;//stop the furnace
          stopGenerators();

          closeWindows();
          all.hide();
          powerplant_arena.show();


          //chief=1;//eastablishing a power plant makes you chief engineer
          //rank_label.text("[Chief Engineer]");

          ppaInit();




        });
        item3_pp_plus.click(function(){//-------build new power plant

          PlayAudio(2);
          powerplant_arena.hide();
          all.show();

          clearInterval(ppa_interval);ppa_interval=null;

          resetPrestige();//resetting all prestige values, antimatter and positrons
          Init();//resetting game

        });

        ppa_upgrade1.click(function(){

          PlayAudio(8);
          ppa_upgrade_price++;
          item3_pp_plus.css('visibility','visible');

          time_fundamental=0.25;
          ppaState();

        });
        ppa_upgrade2.click(function(){

          PlayAudio(8);
          ppa_upgrade_price++;
          item3_pp_plus.css('visibility','visible');

          powerplants_multiplier*=5;
          ppaState();

        });
        ppa_upgrade3.click(function(){

          PlayAudio(8);
          ppa_upgrade_price++;
          item3_pp_plus.css('visibility','visible');

          powerplants_multiplier*=10;
          ppaState();

        });
        ppa_upgrade4.click(function(){

          PlayAudio(8);
          ppa_upgrade_price++;
          item3_pp_plus.css('visibility','visible');

          chief=1;
          chief_check=0;
          rank_label.text("[Chief Engineer]");
          ppaState();

        });

        endgame_back_button.click(function(){
          PlayAudio(2);
          all.show();
          powerplant_arena.hide();
          clearInterval(ppa_interval);ppa_interval=null;

          save_timer_label.text(120);
          button3Disable(save_upgrade);
          SaveLoop();
        });

    button_one.click(function(){

      if(one_price<=0){button1Disable(button_one);return;}

      if(chief_check==0){PlayAudio(1);}

      one_supply=one_price;
      one_supply_label.text(numT(one_supply));

      button1Disable(button_one);
      setTimeout(() => {button_one.prop('disabled', false).attr("class", "button1_genRunning");},500);

      clearInterval(one_interval);

      One();

    });
    button_two.click(function(){

      if(two_price<=0){button1Disable(button_two);return;}

      if(chief_check==0){PlayAudio(1);}

      if(getRandomInt(1,50)==3){
        PlayAudio(9);
      }

      two_supply=two_price;
      two_supply_label.text(numT(two_supply));

      button1Disable(button_two);
      setTimeout(() => {button_two.prop('disabled', false).attr("class", "button1_genRunning");},500);

      clearInterval(two_interval);

      Two();

    });
    button_three.click(function(){

      if(three_price<=0){button1Disable(button_three);return;}

      if(chief_check==0){PlayAudio(1);}

      three_supply=three_price;
      three_supply_label.text(numT(three_supply));

      button1Disable(button_three);
      setTimeout(() => {button_three.prop('disabled', false).attr("class", "button1_genRunning");},500);

      clearInterval(three_interval);

      Three();

    });
    button_four.click(function(){

      if(four_price<=0){button1Disable(button_four);return;}

      if(chief_check==0){PlayAudio(1);}

      four_supply=four_price;
      four_supply_label.text(numT(four_price));

      button1Disable(button_four);
      setTimeout(() => {button_four.prop('disabled', false).attr("class", "button1_genRunning");},500);

      clearInterval(four_interval);

      Four();

    });

    //UPGRADE EVENT HANDLERS

    //GENERAL
    money_limit_upgrade.click(function(){

      PlayAudio(2);

      if(money==money_limit){restartGenerators();}

      money-=money_limit_upgrade_price;
      money_limit=Math.floor(money_limit*1.5);

      money_limit_upgrade_price= Math.floor(money_limit_upgrade_price + money_limit_upgrade_price*0.5);

      money_limit_upgrade.text("⌬" + numT(money_limit_upgrade_price));

      money_limit_label.text("["+numT(money_limit)+"]");

      InventoryUpdate();

    });
    overdrive_upgrade.click(function(){

      //an almost exact copy of this code is in gambling_boosts_upgrade, so any changes here might need to be made there too

      if(chief_check==0){PlayAudio(5);}


      moneyCalc(money_limit);

      button2Disable(overdrive_upgrade);

      overdrive_price=total_money*ogr;
      overdrive_label.text("⌬"+numT(total_money)+"/⌬"+numT(overdrive_price));

      InventoryUpdate();
    });

    buymax_toggle.click(function(){
      PlayAudio(10);
      if(buymax_toggle_flag==0){
        buymax_toggle_flag=1;
        buymax_toggle.html('[<span class="purple">auto</span>]');
      }else{
        buymax_toggle_flag=0;
        buymax_toggle.html('[auto]');
      }
    });
    machines_buymax_toggle.click(function(){
      PlayAudio(10);
      if(machines_buymax_toggle_flag==0){
        machines_buymax_toggle_flag=1;
        machines_buymax_toggle.html('[1/<span class="purple">max</span>]');
      }else{
        machines_buymax_toggle_flag=0;
        machines_buymax_toggle.html('[<span class="purple">1</span>/max]');
      }
    });
    rlab_autobuy_toggle.click(function(){
      PlayAudio(10);
      if(rlab_autobuy_toggle_flag==0){
        rlab_autobuy_toggle_flag=1;
        rlab_autobuy_toggle.html('[<span class="purple">auto</span>]');
      }else{
        rlab_autobuy_toggle_flag=0;
        rlab_autobuy_toggle.text('[auto]');
      }
    });
    one_tank_toggle.click(function(){
      PlayAudio(10);
      if(tank_toggle_flag[0]==0){
        one_tank_toggle.html('[1/<span class="blue">full</span>]');
        setTankPrice(0);
      }else{
        tank_toggle_flag[0]=0;
        one_tank_toggle.html('[<span class="blue">1</span>/full]');
        one_upgrade_effectiveness.text("⌬" + numT(one_upgrade_effectiveness_price));
        power_price_check[0]=one_upgrade_effectiveness_price;
      }
      storeState();
    });
    two_tank_toggle.click(function(){
      PlayAudio(10);
      if(tank_toggle_flag[1]==0){
        two_tank_toggle.html('[1/<span class="blue">full</span>]');
        setTankPrice(1);
      }else{
        tank_toggle_flag[1]=0;
        two_tank_toggle.html('[<span class="blue">1</span>/full]');
        two_upgrade_effectiveness.text("⌬" + numT(two_upgrade_effectiveness_price));
        power_price_check[1]=two_upgrade_effectiveness_price;
      }
      storeState();
    });
    three_tank_toggle.click(function(){
      PlayAudio(10);
      if(tank_toggle_flag[2]==0){
        three_tank_toggle.html('[1/<span class="blue">full</span>]');
        setTankPrice(2);
      }else{
        tank_toggle_flag[2]=0;
        three_tank_toggle.html('[<span class="blue">1</span>/full]');
        three_upgrade_effectiveness.text("⌬" + numT(three_upgrade_effectiveness_price));
        power_price_check[2]=three_upgrade_effectiveness_price;
      }
      storeState();
    });
    four_tank_toggle.click(function(){
      PlayAudio(10);
      if(tank_toggle_flag[3]==0){
        four_tank_toggle.html('[1/<span class="blue">full</span>]');
        setTankPrice(3);
      }else{
        tank_toggle_flag[3]=0;
        four_tank_toggle.html('[<span class="blue">1</span>/full]');
        four_upgrade_effectiveness.text("⌬" + numT(four_upgrade_effectiveness_price));
        power_price_check[3]=four_upgrade_effectiveness_price;
      }
      storeState();
    });

    //GENERATORS
    one_upgrade_supply_limit.click(function(){

      var rgf=0;//restart generators flag; this is required so that when we restart the generators, we have the new supply applied

      var label;
      var cycles=1;//with supply the cycles is always 1, because you don't need that many upgrades

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){rgf=1;}

      while(money-one_upgrade_supply_limit_price>=0 && cycles>0){

        money-=one_upgrade_supply_limit_price;

        one_upgrade_supply_limit_stage+=20;
        if(one_upgrade_supply_limit_stage==100){one_upgrade_supply_limit_stage=0;one_price=one_price*2;cycles=0;}
        else{one_price+=supply_base;}

        one_upgrade_supply_limit_price=one_upgrade_supply_limit_price + one_upgrade_supply_limit_price*sgr;

        cycles--;
      }

      if(one_upgrade_supply_limit_stage==80){label="x2";}
      else{label="+"+supply_base;}

      button_one.text(numT(one_price));

      one_upgrade_supply_limit.text("⌬" + numT(one_upgrade_supply_limit_price));

      progress3(one_upgrade_supply_limit_stage,pb_one_upgrade_supply_limit,pb_one_supply_indicator,label);

      InventoryUpdate();

      if(rgf==1){restartGenerators();}

    });
    one_upgrade_effectiveness.click(function(){

      var label;
      var cycles=0;

      if(buymax_toggle_flag==0){
        PlayAudio(2);cycles=1;
        if(tank_toggle_flag[0]==1){cycles=effectiveness_cycles;}
      }
      else{cycles=effectiveness_cycles;}



      if(money==money_limit){restartGenerators();}

      while(money-one_upgrade_effectiveness_price>=0 && cycles>0){

        one_ratios_flag=1;

        money-=one_upgrade_effectiveness_price;

        one_upgrade_effectiveness_stage+=4;
        if(one_upgrade_effectiveness_stage==100){

          if(one_upgrade_effectiveness_level % 2 === 0){one_upgrade_effectiveness_stage=0;one_multiplier=one_multiplier*100;}
          else{one_upgrade_effectiveness_stage=0;one_multiplier=one_multiplier*5;}

          one_upgrade_effectiveness_level++;

          cycles=0;//stop buymax

        }
        else{one_multiplier+=one_init_multiplier;}

        one_upgrade_effectiveness_price=one_upgrade_effectiveness_price + one_upgrade_effectiveness_price*egr;

        //check if the next iteration puts the price over the next generation price
        if(one_upgrade_effectiveness_price + one_upgrade_effectiveness_price*egr>one_upgrade_generation_price){
          one_upgrade_effectiveness.css("visibility", "hidden").blur();
          cycles=0;//stop buymax

          if(one_generation>=generation_limit){one_effectiveness_block.hide();}
        }

        cycles--;
      }

      //upgrade UI elements
      if(one_upgrade_effectiveness_level % 2 === 0){sup_one_label.text("x100");}
      else{sup_one_label.text("x5");}

      if(one_upgrade_effectiveness_stage==96){//multiplier labels
              if(one_upgrade_effectiveness_level % 2 === 0){label="x100";}
              else{label="x5";}
      }
      else{label="+"+numT(one_init_multiplier);}

      if(tank_toggle_flag[0]==1){
        setTankPrice(0);
      }else{
        one_upgrade_effectiveness.text("⌬" + numT(one_upgrade_effectiveness_price));
        power_price_check[0]=one_upgrade_effectiveness_price;
      }




      progress3(one_upgrade_effectiveness_stage,pb_one_upgrade_effectiveness,pb_one_effectiveness_indicator,label);

      one_effectiveness_label.text("["+numT(one_multiplier)+"]");

      InventoryUpdate();

    });
    one_upgrade_generation.click(function(){

      var label;

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){restartGenerators();}

      //incrementing generation
      one_generation++;
      if(one_generation==generation_limit){one_generation_block.hide();}

      //to make sure we will recalculate ratios when we start this generator
      one_ratios_flag=1;

      money-=one_upgrade_generation_price;

      //generating unit multiplier
      one_init_multiplier=one_init_multiplier*100000000;

      //one_multiplier=one_multiplier*100;

      var fixed_multiplier;

      switch(one_generation){
        case 2: fixed_multiplier=746441400; break;
        case 3: fixed_multiplier=454026565000000000; break;
        case 4: fixed_multiplier=9.2825459625e+25; break;
        case 5: fixed_multiplier=1.5210396353124983e+34; break;
        case 6: fixed_multiplier=2.2620209341406282e+42; break;
        case 7: fixed_multiplier=3.188247557675796e+50; break;
        case 8: fixed_multiplier=4.346030837094735e+58; break;
        case 9: fixed_multiplier=5.793259936368435e+66; break;
        case 10: fixed_multiplier=7.602296310460565e+74; break;
      }

      one_multiplier=prestige_multiplier*fixed_multiplier;



      //effectiveness price
      one_upgrade_effectiveness_price= Math.floor(one_upgrade_generation_price);
      //one_upgrade_effectiveness.text("⌬" + numT(one_upgrade_effectiveness_price));
      //supply limit price
      one_upgrade_supply_limit_price= Math.floor(one_upgrade_generation_price);
      one_upgrade_supply_limit.text("⌬" + numT(one_upgrade_supply_limit_price));

      //resetting the generator
      one_x=0;g_electric.css('background-position', + one_x + 'px 0px');
      if(buymax_toggle_flag==0){clearInterval(one_interval);}//to make sure the generator does not stop during auto-buy

      //resetting effectiveness
      one_upgrade_effectiveness_stage=0;
      one_upgrade_effectiveness_level=1;sup_one_label.text("x5");

      one_effectiveness_label.text("["+numT(one_multiplier)+"]");
      label="+"+numT(one_init_multiplier);
      progress3(one_upgrade_effectiveness_stage,pb_one_upgrade_effectiveness,pb_one_effectiveness_indicator,label);

      //resetting supply
      one_upgrade_supply_limit_stage=0;
      one_supply=0;one_supply_label.text(one_supply);
      one_price=supply_base;
      button_one.text(numT(one_price));
      button1Enable(button_one);

      progress3(0,pb_one_upgrade_supply_limit,pb_one_supply_indicator,"+"+supply_base);

      //generator generation price
      one_upgrade_generation_price= one_upgrade_generation_price*Math.pow(10,14);
      one_upgrade_generation.text("⌬" + numT(one_upgrade_generation_price));

      if(tank_toggle_flag[0]==1){
        setTankPrice(0);
      }else{
        one_upgrade_effectiveness.text("⌬" + numT(one_upgrade_effectiveness_price));
        power_price_check[0]=one_upgrade_effectiveness_price;
      }

      //other updates
      one_generation_label.text("Generation " + romanize(one_generation+1));
      one_name_label.text("Electric " + romanize(one_generation));
      one_upgrade_effectiveness.css("visibility", "visible");//removing the alert of going over the generation price
      InventoryUpdate();

    });

    two_upgrade_supply_limit.click(function(){

      var rgf=0;

      var label;
      var cycles=1;

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){rgf=1;}

      if(two_price==0){button1Enable(button_two);}


      while(money-two_upgrade_supply_limit_price>=0 && cycles>0){
        money-=two_upgrade_supply_limit_price;

        two_upgrade_supply_limit_stage+=20;
        if(two_upgrade_supply_limit_stage==100){two_upgrade_supply_limit_stage=0;two_price=two_price*2;cycles=0;}
        else{two_price+=supply_base;}

        two_upgrade_supply_limit_price=two_upgrade_supply_limit_price + two_upgrade_supply_limit_price*sgr;
        cycles--;
      }

      if(two_upgrade_supply_limit_stage==80){label="x2";}
      else{label="+"+supply_base;}

      button_two.text(numT(two_price));

      two_upgrade_supply_limit.text("⌬" + numT(two_upgrade_supply_limit_price));

      progress3(two_upgrade_supply_limit_stage,pb_two_upgrade_supply_limit,pb_two_supply_indicator,label);

      InventoryUpdate();

      if(rgf==1){restartGenerators();}

    });
    two_upgrade_effectiveness.click(function(){

      var label;
      var cycles=0;

      if(buymax_toggle_flag==0){
        PlayAudio(2);cycles=1;
        if(tank_toggle_flag[1]==1){cycles=effectiveness_cycles;}
      }
      else{cycles=effectiveness_cycles;}

      if(money==money_limit){restartGenerators();}

      while(money-two_upgrade_effectiveness_price>=0 && cycles>0){

        two_ratios_flag=1;

        money-=two_upgrade_effectiveness_price;

        two_upgrade_effectiveness_stage+=4;
        if(two_upgrade_effectiveness_stage==100){

          if(two_upgrade_effectiveness_level % 2 === 0){two_upgrade_effectiveness_stage=0;two_multiplier=two_multiplier*100;}
          else{two_upgrade_effectiveness_stage=0;two_multiplier=two_multiplier*5;}

          two_upgrade_effectiveness_level++;

          cycles=0;

        }
        else{two_multiplier+=two_init_multiplier;}

        two_upgrade_effectiveness_price=two_upgrade_effectiveness_price + two_upgrade_effectiveness_price*egr;

        //check if the next iteration puts the price over the next generation price and stop buymax
        if(two_upgrade_effectiveness_price + two_upgrade_effectiveness_price*egr>two_upgrade_generation_price){
          two_upgrade_effectiveness.css("visibility", "hidden").blur();
          cycles=0;

          if(two_generation>=generation_limit){two_effectiveness_block.hide();}
        }

        cycles--;
      }

        if(two_upgrade_effectiveness_level % 2 === 0){sup_two_label.text("x100");}
        else{sup_two_label.text("x5");}

        if(two_upgrade_effectiveness_stage==96){//multiplier labels
                if(two_upgrade_effectiveness_level % 2 === 0){label="x100";}
                else{label="x5";}
        }
        else{label="+"+numT(two_init_multiplier);}

        if(tank_toggle_flag[1]==1){
          setTankPrice(1);
        }else{
          two_upgrade_effectiveness.text("⌬" + numT(two_upgrade_effectiveness_price));
          power_price_check[1]=two_upgrade_effectiveness_price;
        }




        progress3(two_upgrade_effectiveness_stage,pb_two_upgrade_effectiveness,pb_two_effectiveness_indicator,label);

        two_effectiveness_label.text("["+numT(two_multiplier)+"]");

        InventoryUpdate();


    });
    two_upgrade_generation.click(function(){

      var label;

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){restartGenerators();}

      //incrementing generation
      two_generation++;
      if(two_generation==generation_limit){two_generation_block.hide();}

      //to make sure we will recalculate ratios when we start this generator
      two_ratios_flag=1;

      money-=two_upgrade_generation_price;

      //generating generator multiplier
      two_init_multiplier=two_init_multiplier*100000000;

      var fixed_multiplier;

      switch(two_generation){
        case 2: fixed_multiplier=74644170000; break;
        case 3: fixed_multiplier=45402660250000000000; break;
        case 4: fixed_multiplier=9.282546431250019e+27; break;
        case 5: fixed_multiplier=1.5210396939062585e+36; break;
        case 6: fixed_multiplier=2.262021007382825e+44; break;
        case 7: fixed_multiplier=3.188247649228516e+52; break;
        case 8: fixed_multiplier=4.3460309515356394e+60; break;
        case 9: fixed_multiplier=5.793260079419542e+68; break;
        case 10: fixed_multiplier=7.602296489274422e+76; break;
      }

      two_multiplier=prestige_multiplier*fixed_multiplier;


      //effectiveness price
      two_upgrade_effectiveness_price= Math.floor(two_upgrade_generation_price);
      //two_upgrade_effectiveness.text("⌬" + numT(two_upgrade_effectiveness_price));
      //supply limit price
      two_upgrade_supply_limit_price= Math.floor(two_upgrade_generation_price);
      two_upgrade_supply_limit.text("⌬" + numT(two_upgrade_supply_limit_price));

      //resetting the generator
      two_x=0;g_plasma.css('background-position', + two_x + 'px 0px');
      if(buymax_toggle_flag==0){clearInterval(two_interval);}

      //resetting effectiveness
      two_upgrade_effectiveness_stage=0;
      two_upgrade_effectiveness_level=1;sup_two_label.text("x5");

      two_effectiveness_label.text("["+numT(two_multiplier)+"]");
      label="+"+numT(two_init_multiplier);
      progress3(two_upgrade_effectiveness_stage,pb_two_upgrade_effectiveness,pb_two_effectiveness_indicator,label);

      //resetting supply
      two_upgrade_supply_limit_stage=0;
      two_supply=0;two_supply_label.text(two_supply);
      two_price=supply_base;
      button_two.text(numT(two_price));
      button1Enable(button_two);

      progress3(0,pb_two_upgrade_supply_limit,pb_two_supply_indicator,"+"+supply_base);

      //generator generation price
      two_upgrade_generation_price= two_upgrade_generation_price*Math.pow(10,14);
      two_upgrade_generation.text("⌬" + numT(two_upgrade_generation_price));

      if(tank_toggle_flag[1]==1){
        setTankPrice(1);
      }else{
        two_upgrade_effectiveness.text("⌬" + numT(two_upgrade_effectiveness_price));
        power_price_check[1]=two_upgrade_effectiveness_price;
      }

      //other updates
      two_generation_label.text("Generation " + romanize(two_generation+1));
      two_name_label.text("Plasma " + romanize(two_generation));
      two_upgrade_effectiveness.css("visibility", "visible");
      InventoryUpdate();

    });

    three_upgrade_supply_limit.click(function(){

      var rgf=0;

      var label;
      var cycles=1;

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){rgf=1;}

      if(three_price==0){button1Enable(button_three);}

      while(money-three_upgrade_supply_limit_price>=0 && cycles>0){
        money-=three_upgrade_supply_limit_price;

        three_upgrade_supply_limit_stage+=20;
        if(three_upgrade_supply_limit_stage==100){three_upgrade_supply_limit_stage=0;three_price=three_price*2;cycles=0;}
        else{three_price+=supply_base;}

        three_upgrade_supply_limit_price=three_upgrade_supply_limit_price + three_upgrade_supply_limit_price*sgr;
        cycles--;
      }


      if(three_upgrade_supply_limit_stage==80){label="x2";}
      else{label="+"+supply_base;}

      button_three.text(numT(three_price));

      three_upgrade_supply_limit.text("⌬" + numT(three_upgrade_supply_limit_price));

      progress3(three_upgrade_supply_limit_stage,pb_three_upgrade_supply_limit,pb_three_supply_indicator,label);

      InventoryUpdate();

      if(rgf==1){restartGenerators();}

    });
    three_upgrade_effectiveness.click(function(){

      var label;
      var cycles=0;

      if(buymax_toggle_flag==0){
        PlayAudio(2);cycles=1;
        if(tank_toggle_flag[2]==1){cycles=effectiveness_cycles;}
      }
      else{cycles=effectiveness_cycles;}

      if(money==money_limit){restartGenerators();}

      while(money-three_upgrade_effectiveness_price>=0 && cycles>0){

        three_ratios_flag=1;

        money-=three_upgrade_effectiveness_price;

        three_upgrade_effectiveness_stage+=4;
        if(three_upgrade_effectiveness_stage==100){

          if(three_upgrade_effectiveness_level % 2 === 0){three_upgrade_effectiveness_stage=0;three_multiplier=three_multiplier*100;}
          else{three_upgrade_effectiveness_stage=0;three_multiplier=three_multiplier*5;}

          three_upgrade_effectiveness_level++;

          cycles=0;

        }
        else{three_multiplier+=three_init_multiplier;}

        three_upgrade_effectiveness_price=three_upgrade_effectiveness_price + three_upgrade_effectiveness_price*egr;

        //check if the next iteration puts the price over the next generation price and stop buymax
        if(three_upgrade_effectiveness_price + three_upgrade_effectiveness_price*egr>three_upgrade_generation_price){
          three_upgrade_effectiveness.css("visibility", "hidden").blur();
          cycles=0;

          if(three_generation>=generation_limit){three_effectiveness_block.hide();}
        }


        cycles--;
      }

      if(three_upgrade_effectiveness_level % 2 === 0){sup_three_label.text("x100");}
      else{sup_three_label.text("x5");}

      if(three_upgrade_effectiveness_stage==96){//multiplier labels
              if(three_upgrade_effectiveness_level % 2 === 0){label="x100";}
              else{label="x5";}
      }
      else{label="+"+numT(three_init_multiplier);}

      if(tank_toggle_flag[2]==1){
        setTankPrice(2);
      }else{
        three_upgrade_effectiveness.text("⌬" + numT(three_upgrade_effectiveness_price));
        power_price_check[2]=three_upgrade_effectiveness_price;
      }


      progress3(three_upgrade_effectiveness_stage,pb_three_upgrade_effectiveness,pb_three_effectiveness_indicator,label);

      three_effectiveness_label.text("["+numT(three_multiplier)+"]");

      InventoryUpdate();

    });
    three_upgrade_generation.click(function(){

      var label;

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){restartGenerators();}

      //incrementing generation
      three_generation++;
      if(three_generation==generation_limit){three_generation_block.hide();}

      //to make sure we will recalculate ratios when we start this generator
      three_ratios_flag=1;

      money-=three_upgrade_generation_price;

      //generating generator multiplier
      three_init_multiplier=three_init_multiplier*100000000;

      var fixed_multiplier;

      switch(three_generation){
        case 2: fixed_multiplier=7464420000000; break;
        case 3: fixed_multiplier=4.540266399999992e+21; break;
        case 4: fixed_multiplier=9.282546899999991e+29; break;
        case 5: fixed_multiplier=1.521039752499998e+38; break;
        case 6: fixed_multiplier=2.262021080625002e+46; break;
        case 7: fixed_multiplier=3.1882477407812464e+54; break;
        case 8: fixed_multiplier=4.346031065976573e+62; break;
        case 9: fixed_multiplier=5.793260222470728e+70; break;
        case 10: fixed_multiplier=7.602296668088394e+78; break;
      }

      three_multiplier=prestige_multiplier*fixed_multiplier;

      //effectiveness price
      three_upgrade_effectiveness_price= Math.floor(three_upgrade_generation_price);
      //three_upgrade_effectiveness.text("⌬" + numT(three_upgrade_effectiveness_price));
      //supply limit price
      three_upgrade_supply_limit_price= Math.floor(three_upgrade_generation_price);
      three_upgrade_supply_limit.text("⌬" + numT(three_upgrade_supply_limit_price));

      //resetting the generator
      three_x=0;g_nuclear.css('background-position', + three_x + 'px 0px');
      if(buymax_toggle_flag==0){clearInterval(three_interval);}

      //resetting effectiveness
      three_upgrade_effectiveness_stage=0;
      three_upgrade_effectiveness_level=1;sup_three_label.text("x5");

      three_effectiveness_label.text("["+numT(three_multiplier)+"]");
      label="+"+numT(three_init_multiplier);
      progress3(three_upgrade_effectiveness_stage,pb_three_upgrade_effectiveness,pb_three_effectiveness_indicator,label);

      //resetting supply
      three_upgrade_supply_limit_stage=0;
      three_supply=0;three_supply_label.text(three_supply);
      three_price=supply_base;
      button_three.text(numT(three_price));
      button1Enable(button_three);

      progress3(0,pb_three_upgrade_supply_limit,pb_three_supply_indicator,"+"+supply_base);

      //generator generation price
      three_upgrade_generation_price= three_upgrade_generation_price*Math.pow(10,14);
      three_upgrade_generation.text("⌬" + numT(three_upgrade_generation_price));

      if(tank_toggle_flag[2]==1){
        setTankPrice(2);
      }else{
        three_upgrade_effectiveness.text("⌬" + numT(three_upgrade_effectiveness_price));
        power_price_check[2]=three_upgrade_effectiveness_price;
      }

      //other updates
      three_generation_label.text("Generation " + romanize(three_generation+1));
      three_name_label.text("Nuclear " + romanize(three_generation));
      three_upgrade_effectiveness.css("visibility", "visible");
      InventoryUpdate();

    });

    four_upgrade_supply_limit.click(function(){

      var rgf=0;

      var label;
      var cycles=1;

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){rgf=1;}

      if(four_price==0){button1Enable(button_four);}

      while(money-four_upgrade_supply_limit_price>=0 && cycles>0){
        money-=four_upgrade_supply_limit_price;

        four_upgrade_supply_limit_stage+=20;
        if(four_upgrade_supply_limit_stage==100){four_upgrade_supply_limit_stage=0;four_price=four_price*2;cycles=0;}
        else{four_price+=supply_base;}

        four_upgrade_supply_limit_price=four_upgrade_supply_limit_price + four_upgrade_supply_limit_price*sgr;
        cycles--;
      }

      if(four_upgrade_supply_limit_stage==80){label="x2";}
      else{label="+"+supply_base;}

      button_four.text(numT(four_price));

      four_upgrade_supply_limit.text("⌬" + numT(four_upgrade_supply_limit_price));

      progress3(four_upgrade_supply_limit_stage,pb_four_upgrade_supply_limit,pb_four_supply_indicator,label);

      InventoryUpdate();

      if(rgf==1){restartGenerators();}

    });
    four_upgrade_effectiveness.click(function(){

      var label;
      var cycles=0;

      if(buymax_toggle_flag==0){
        PlayAudio(2);cycles=1;
        if(tank_toggle_flag[3]==1){cycles=effectiveness_cycles;}
      }
      else{cycles=effectiveness_cycles;}

      if(money==money_limit){restartGenerators();}

      while(money-four_upgrade_effectiveness_price>=0 && cycles>0){

        four_ratios_flag=1;

        money-=four_upgrade_effectiveness_price;

        four_upgrade_effectiveness_stage+=4;
        if(four_upgrade_effectiveness_stage==100){

          if(four_upgrade_effectiveness_level % 2 === 0){four_upgrade_effectiveness_stage=0;four_multiplier=four_multiplier*100;}
          else{four_upgrade_effectiveness_stage=0;four_multiplier=four_multiplier*5;}

          four_upgrade_effectiveness_level++;

          cycles=0;

        }
        else{four_multiplier+=four_init_multiplier;}

        four_upgrade_effectiveness_price=four_upgrade_effectiveness_price + four_upgrade_effectiveness_price*egr;


        //check if the next iteration puts the price over the next generation price and stop buymax
        if(four_upgrade_effectiveness_price + four_upgrade_effectiveness_price*egr>four_upgrade_generation_price){
          four_upgrade_effectiveness.css("visibility", "hidden").blur();
          cycles=0;

          if(four_generation>=generation_limit){four_effectiveness_block.hide();}
        }


        cycles--;
      }


      if(four_upgrade_effectiveness_level % 2 === 0){sup_four_label.text("x100");}
      else{sup_four_label.text("x5");}

      if(four_upgrade_effectiveness_stage==96){//multiplier labels
              if(four_upgrade_effectiveness_level % 2 === 0){label="x100";}
              else{label="x5";}
      }
      else{label="+"+numT(four_init_multiplier);}

      if(tank_toggle_flag[3]==1){
        setTankPrice(3);
      }else{
        four_upgrade_effectiveness.text("⌬" + numT(four_upgrade_effectiveness_price));
        power_price_check[3]=four_upgrade_effectiveness_price;
      }


      progress3(four_upgrade_effectiveness_stage,pb_four_upgrade_effectiveness,pb_four_effectiveness_indicator,label);

      four_effectiveness_label.text("["+numT(four_multiplier)+"]");

      InventoryUpdate();

    });
    four_upgrade_generation.click(function(){

      var label;

      if(audio_override==0){PlayAudio(2);}

      if(money==money_limit){restartGenerators();}

      //incrementing generation
      four_generation++;
      if(four_generation==generation_limit){four_generation_block.hide();}

      //to make sure we will recalculate ratios when we start this generator
      four_ratios_flag=1;

      money-=four_upgrade_generation_price;

      //generating generator multiplier
      four_init_multiplier=four_init_multiplier*100000000;

      var fixed_multiplier;

      switch(four_generation){
        case 2: fixed_multiplier=746442300000000; break;
        case 3: fixed_multiplier=4.540266774999995e+23; break;
        case 4: fixed_multiplier=9.282547368750024e+31; break;
        case 5: fixed_multiplier=1.521039811093754e+40; break;
        case 6: fixed_multiplier=2.262021153867188e+48; break;
        case 7: fixed_multiplier=3.188247832333969e+56; break;
        case 8: fixed_multiplier=4.3460311804174426e+64; break;
        case 9: fixed_multiplier=5.793260365521837e+72; break;
        case 10: fixed_multiplier=7.602296846902273e+80; break;
      }

      four_multiplier=prestige_multiplier*fixed_multiplier;

      //effectiveness price
      four_upgrade_effectiveness_price= Math.floor(four_upgrade_generation_price);
      //four_upgrade_effectiveness.text("⌬" + numT(four_upgrade_effectiveness_price));
      //supply limit price
      four_upgrade_supply_limit_price= Math.floor(four_upgrade_generation_price);
      four_upgrade_supply_limit.text("⌬" + numT(four_upgrade_supply_limit_price));

      //resetting the generator
      four_x=0;g_gravity.css('background-position', + four_x + 'px 0px');
      if(buymax_toggle_flag==0){clearInterval(four_interval);}

      //resetting effectiveness
      four_upgrade_effectiveness_stage=0;
      four_upgrade_effectiveness_level=1;sup_four_label.text("x5");

      four_effectiveness_label.text("["+numT(four_multiplier)+"]");
      label="+"+numT(four_init_multiplier);
      progress3(four_upgrade_effectiveness_stage,pb_four_upgrade_effectiveness,pb_four_effectiveness_indicator,label);

      //resetting supply
      four_upgrade_supply_limit_stage=0;
      four_supply=0;four_supply_label.text(four_supply);
      four_price=supply_base;
      button_four.text(numT(four_price));
      button1Enable(button_four);

      progress3(0,pb_four_upgrade_supply_limit,pb_four_supply_indicator,"+"+supply_base);

      //generator generation price
      four_upgrade_generation_price= four_upgrade_generation_price*Math.pow(10,14);
      four_upgrade_generation.text("⌬" + numT(four_upgrade_generation_price));

      if(tank_toggle_flag[3]==1){
        setTankPrice(3);
      }else{
        four_upgrade_effectiveness.text("⌬" + numT(four_upgrade_effectiveness_price));
        power_price_check[3]=four_upgrade_effectiveness_price;
      }

      //other updates
      four_generation_label.text("Generation " + romanize(four_generation+1));
      four_name_label.text("Gravity " + romanize(four_generation));
      four_upgrade_effectiveness.css("visibility", "visible");
      InventoryUpdate();

    });

    //MACHINES

    //minimize machines
    battery_title.click(function(){

      PlayAudio(10);

      if(battery_min_flag==0){
        battery_min_flag=1;
        battery_body.hide();
      }else{
        battery_min_flag=0;
        battery_body.show();
      }

    });
    magnetron_title.click(function(){

      PlayAudio(10);

      if(magnetron_min_flag==0){
        magnetron_min_flag=1;
        magnetron_body.hide();
      }else{
        magnetron_min_flag=0;
        magnetron_body.show();
      }

    });
    gambling_title.click(function(){

      PlayAudio(10);

      if(gambling_min_flag==0){
        gambling_min_flag=1;
        gambling_body.hide();
      }else{
        gambling_min_flag=0;
        gambling_body.show();
      }

    });
    foundry_title.click(function(){

      PlayAudio(10);

      if(foundry_min_flag==0){
        foundry_min_flag=1;
        foundry_body.hide();
      }else{
        foundry_min_flag=0;
        foundry_body.show();
      }

    });
    radiator_title.click(function(){

      PlayAudio(10);

      if(radiator_min_flag==0){
        radiator_min_flag=1;
        radiator_body.hide();
      }else{
        radiator_min_flag=0;
        radiator_body.show();
      }

    });
    pc_title.click(function(){

      PlayAudio(10);

      if(pc_min_flag==0){
        pc_min_flag=1;
        pc_body.hide();
      }else{
        pc_min_flag=0;
        pc_body.show();
      }

    });

    //battery
    battery_unlock_upgrade.click(function(){

      PlayAudio(2);

      if(money==money_limit){restartGenerators();}

      money-=battery_unlock_upgrade_price;


      //default parameters
      batteryInit();

      InventoryUpdate();

    });
    battery_percent_up.click(function(){



      if(battery_charge_percentage<battery_charge_percentage_limit){
        PlayAudio(7);
        battery_charge_percentage++;
        battery_charge_percentage_label.text(battery_charge_percentage+"%");
      }

      if(battery_charge_percentage>=10 && foundry_state==1){
        furnace_screen.removeClass('furnace_screen_dim').addClass('furnace_screen_lit');

        clearInterval(furnace_cooling_timer);
        furnace_cooling_timer = null;// release our intervalID from the variable; otherwise it will not pass the if(!furnace_cooling_timer) check in battery_percent_down.click()
      }

    });
    battery_percent_down.click(function(){



      if(battery_charge_percentage>0){
        PlayAudio(7);
        battery_charge_percentage--;
        battery_charge_percentage_label.text(battery_charge_percentage+"%");
        if(battery_charge_percentage==0){
          battery_effectiveness_label.text("[⑂0]");
        }
      }

      if(battery_charge_percentage<10 && foundry_state==1 && quantum_upgrade_flag[0]==0){

        furnace_screen.removeClass('furnace_screen_lit').addClass('furnace_screen_dim');

          foundry_production_flag=0;

          if(!furnace_cooling_timer){//prevents from launching the interval twice
            furnace_cooling_timer=setInterval(function() {

              foundry_temperature-=getRandomInt(0,5);
              if(foundry_temperature<=0){foundry_temperature=0;clearInterval(furnace_cooling_timer);furnace_cooling_timer = null;}
              furnace_screen.text(foundry_temperature+" °C");

            }, 1000);
          }


      }

    });
    battery_percent_up_up.click(function(){



      if(battery_charge_percentage<battery_charge_percentage_limit){
        PlayAudio(7);


        if(battery_charge_percentage==0){battery_charge_percentage=1;}

        else if(battery_charge_percentage>=1 && battery_charge_percentage<10){
          if(battery_charge_percentage_limit>=10){battery_charge_percentage=10;}
          else{battery_charge_percentage=battery_charge_percentage_limit;}
        }

        else if(battery_charge_percentage>=10){battery_charge_percentage=battery_charge_percentage_limit;}


        battery_charge_percentage_label.text(battery_charge_percentage+"%");
      }

      if(battery_charge_percentage>=10 && foundry_state==1){
        furnace_screen.removeClass('furnace_screen_dim').addClass('furnace_screen_lit');

        clearInterval(furnace_cooling_timer);
        furnace_cooling_timer = null;// release our intervalID from the variable; otherwise it will not pass the if(!furnace_cooling_timer) check in battery_percent_down.click()
      }

    });
    battery_percent_down_down.click(function(){



      if(battery_charge_percentage>0){
        PlayAudio(7);

        if(battery_charge_percentage>10){battery_charge_percentage=10;}
        else if(battery_charge_percentage>1){battery_charge_percentage=1;}
        else if(battery_charge_percentage==1){battery_charge_percentage=0;}





        battery_charge_percentage_label.text(battery_charge_percentage+"%");
        if(battery_charge_percentage==0){
          battery_effectiveness_label.text("[⑂0]");
        }
      }

      if(battery_charge_percentage<10 && foundry_state==1 && quantum_upgrade_flag[0]==0){

        furnace_screen.removeClass('furnace_screen_lit').addClass('furnace_screen_dim');

          foundry_production_flag=0;

          if(!furnace_cooling_timer){//prevents from launching the interval twice
            furnace_cooling_timer=setInterval(function() {

              foundry_temperature-=getRandomInt(0,5);
              if(foundry_temperature<=0){foundry_temperature=0;clearInterval(furnace_cooling_timer);furnace_cooling_timer = null;}
              furnace_screen.text(foundry_temperature+" °C");

            }, 1000);
          }


      }

    });

    charge_limit_upgrade.click(function(){

      PlayAudio(2);

      charge-=charge_limit_upgrade_price;
      charge_limit=Math.floor(charge_limit*1.5);

      charge_limit_upgrade_price= Math.floor(charge_limit_upgrade_price + charge_limit_upgrade_price*0.5);
      charge_limit_upgrade.text("⑂" + numT(charge_limit_upgrade_price));

      charge_limit_label.text("["+numT(charge_limit)+"]");

      ChargeUpdate();

    });
    charge_throughput_upgrade.click(function(){

      PlayAudio(2);

      var cycles=0;

      if(machines_buymax_toggle_flag==1){cycles=100;}
      else{cycles=1;}

      while(charge-charge_throughput_upgrade_price>=0 && cycles>0){

        charge-=charge_throughput_upgrade_price;
        battery_charge_percentage_limit++;

        if(battery_charge_percentage_limit>=100){
          charge_throughput_upgrade.hide();
        }

        charge_throughput_upgrade_price= Math.floor(charge_throughput_upgrade_price*20);

        cycles--;
      }

      charge_throughput_upgrade.text("⑂" + numT(charge_throughput_upgrade_price));
      charge_throughput_label.text("["+battery_charge_percentage_limit+"%]");

      ChargeUpdate();

    });

    //magnetron
    magnetron_unlock_upgrade.click(function(){

      PlayAudio(2);

      charge-=magnetron_unlock_upgrade_price;

      //default parameters
      magnetronInit();

      ChargeUpdate();

    });
    magnetron_button.click(function(){//the big magnetron button

      var num=0;
      PlayAudio(5);

      magnetron_state=3;//magnetron is running; although another way to track this state is if magnetron_multiplier!=1


      magnetron_multiplier=(device_magnetron_multiplier+animal3_magnetron_multiplier);
      pb_money_indicator.css("background-color","#f48c37");

      magnetron_buttonActiveDisabled();
      magnetron_button.text((magnetron_duration+animal2_magnetron_duration)+" sec");

      GeneratorRatios();

      if(!magnetron_interval){
        magnetron_interval=setInterval(function() {

          num++;
          magnetron_button.text(parseInt((magnetron_duration+animal2_magnetron_duration)-num)+" sec");

          if(num>=(magnetron_duration+animal2_magnetron_duration)){
            magnetronShutdown();
            clearInterval(magnetron_interval);magnetron_interval=null;
          }


        }, 1000);
      }


    });

    magnetron_multiplier_upgrade.click(function(){

      if(chief_check==0){PlayAudio(2);}

      var cycles=0;

      if(machines_buymax_toggle_flag==1){cycles=20;}
      else{cycles=1;}

      while(charge-magnetron_multiplier_upgrade_price>=0 && cycles>0){

        charge-=magnetron_multiplier_upgrade_price;
        device_magnetron_multiplier++;
        magnetron_multiplier_upgrade_price=magnetron_multiplier_upgrade_price*5;

        if(device_magnetron_multiplier>=warp_max_magnetron_multiplier){
          magnetron_multiplier_upgrade.hide();
          cycles=0;//stop buying
        }

        cycles--;
      }

      //upgrading UI bits

      magnetron_multiplier_upgrade.text("⑂" + numT(magnetron_multiplier_upgrade_price));
      magnetron_multiplier_label.text("[x"+device_magnetron_multiplier+"]");
      //so that we upgrade the button only when magnetron is not running. when it is, the timer is displayed on the button instead
      if(magnetron_multiplier==1){magnetron_button.text("x"+(device_magnetron_multiplier+animal3_magnetron_multiplier));}

      ChargeUpdate();

    });
    magnetron_duration_upgrade.click(function(){

      if(chief_check==0){PlayAudio(2);}

      var cycles=0;

      if(machines_buymax_toggle_flag==1){cycles=20;}
      else{cycles=1;}

      while(charge-magnetron_duration_upgrade_price>=0 && cycles>0){

        charge-=magnetron_duration_upgrade_price;
        magnetron_duration+=5;
        magnetron_duration_upgrade_price=magnetron_duration_upgrade_price*3;

        if(magnetron_duration>=warp_max_magnetron_duration){
          magnetron_duration_upgrade.hide();
          cycles=0;
        }

        cycles--;
      }

      magnetron_duration_upgrade.text("⑂" + numT(magnetron_duration_upgrade_price));
      magnetron_duration_label.text("["+(magnetron_duration)+" sec]");

      ChargeUpdate();

    });

    //engden
    auxiliary_lever1.mousemove(function(){
        var avalue;
        var aeu_combined=aux_eff_unit+animal5_auxiliary_effectiveness_modifier;
        var ae_max=50+50+animal5_auxiliary_effectiveness_modifier*2;
        auxiliary_effectiveness1=aeu_combined-Math.abs( Math.floor(auxiliary_lever1.val()/10) * (aeu_combined/5) );//we need Math.abs because the lever has negative values -50 ... 50
        auxiliary_effectiveness=1+(auxiliary_effectiveness1+auxiliary_effectiveness2)*0.01;
        //console.log(auxiliary_effectiveness);
        if(animal5_auxiliary_effectiveness_modifier>0){
          auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%/"+ae_max+"%]");
        }else{
          auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%]");
        }

        GeneratorRatios();
    });
    auxiliary_lever2.mousemove(function(){
        var avalue;
        var aeu_combined=aux_eff_unit+animal5_auxiliary_effectiveness_modifier;
        var ae_max=50+50+animal5_auxiliary_effectiveness_modifier*2;
        auxiliary_effectiveness2=aeu_combined-Math.abs( Math.ceil(auxiliary_lever2.val()/10) * (aeu_combined/5) );
        auxiliary_effectiveness=1+(auxiliary_effectiveness1+auxiliary_effectiveness2)*0.01;
        //console.log(auxiliary_effectiveness);
        if(animal5_auxiliary_effectiveness_modifier>0){
          auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%/"+ae_max+"%]");
        }else{
          auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%]");
        }

        GeneratorRatios();
    });
    night_shift_toggle.click(function(){

      if(chief_check==1){return;}

      PlayAudio(8);

      if(night_shift==0){
        night_shift=1;
        night_shift_toggle.attr("class", "engden_on").text("ON");
        if(money==money_limit){restartGenerators();}
        InventoryUpdate();//this is called because this is where the auto-buy happens
      }else{
        night_shift=0;
        night_shift_toggle.attr("class", "engden_off").text("OFF");
      }
    });

    //foundry
    foundry_unlock_upgrade.click(function(){

      PlayAudio(2);

      charge-=foundry_unlock_upgrade_price;


      //default parameters
      foundryInit();

      ChargeUpdate();

    });
    foundry_components_cycle_upgrade.click(function(){

      var label;

      PlayAudio(2);

      var cycles=0;

      if(machines_buymax_toggle_flag==1){cycles=160;}
      else{cycles=1;}

      while(charge-foundry_components_cycle_upgrade_price>=0 && cycles>0){

        charge-=foundry_components_cycle_upgrade_price;

        fccu_stage+=5;
        if(fccu_stage==100){

          if(fccu_level % 2 === 0){fccu_stage=0;foundry_components_multiplier=foundry_components_multiplier*100;}
          else{fccu_stage=0;foundry_components_multiplier=foundry_components_multiplier*5;}

          fccu_level++;

        }
        else{foundry_components_multiplier+=1;}

        foundry_components_cycle_upgrade_price = foundry_components_cycle_upgrade_price*1.15;

        cycles--;
      }


      if(fccu_stage==95){

        if(fccu_level % 2 === 0){label="x100";}
        else{label="x5";}

      }
      else{label="+1";}

      progress3(fccu_stage,pb_components_multiplier,pb_components_multiplier_indicator,label);
      foundry_components_cycle_upgrade.text("⑂" + numT(foundry_components_cycle_upgrade_price));
      foundry_components_multiplier_label.text("["+numT(foundry_components_multiplier*foundry_components_multiplier_qm)+"]");

      ChargeUpdate();

    });
    foundry_recycle_upgrade.click(function(){

      //this bonus adds 30% of the whole money limit. It neutralizes any of the additional bonuses and it will cap at money limit, which means your bonus might be less than 30% if you are aleady over 70%

      PlayAudio(2);

      if(magnetron_multiplier>1){//neutralizing the magnetron multiplier
        moneyCalc(money_limit*0.3/(magnetron_multiplier*auxiliary_effectiveness*(bonus_multiplier+animal1_bonus_multiplier)*am_radiation_multiplier) );
      }else{moneyCalc(money_limit*0.3 / ( auxiliary_effectiveness*(bonus_multiplier+animal1_bonus_multiplier)*am_radiation_multiplier ) );}


      button1Disable(foundry_recycle_upgrade);

      //foundry_waste_limit=foundry_waste_limit*10;
      foundry_waste=0;
      foundry_waste_label.text(foundry_waste+"/"+foundry_waste_limit);

      InventoryUpdate();

    });

    //radiator
    radiator_unlock_upgrade.click(function(){

      PlayAudio(2);

      charge-=radiator_unlock_upgrade_price;


      //default parameters
      radiatorInit();

      ChargeUpdate();

    });
    radiator_button_center.click(function(){

      PlayAudio(2);

      if(radiator_active==0){
        radiator_active=1;
        radiator_button_center.text("ON");
        radiatorSwitch();
      }else{
        radiator_active=0;
        radiator_button_center.text("OFF");
        radiatorSwitch();
      }

    });
    radiator_button_left.click(function(){

      PlayAudio(7);


        radiator_playhead--;
        if(radiator_playhead<0){radiator_playhead=3;}
        radiatorSwitch();



    });
    radiator_button_right.click(function(){

      PlayAudio(7);


        radiator_playhead++;
        if(radiator_playhead>3){radiator_playhead=0;}
        radiatorSwitch();



    });

    //pc
    pc_unlock_upgrade.click(function(){

      PlayAudio(2);

      //default parameters
      pcInit();

      factoryState();

    });
    pc_emission_upgrade.click(function(){

      PlayAudio(2);

      var cycles=0;

      if(machines_buymax_toggle_flag==1){cycles=500;}
      else{cycles=1;}

      while(foundry_components-pc_emission_upgrade_price>=0 && cycles>0){

        foundry_components-=pc_emission_upgrade_price;
        pc_emission_upgrade_price*=1.05;
        pc_emission+=100;

        cycles--;
      }

      foundry_components_label.text("⯎" + numT(foundry_components));
      pc_emission_upgrade.text( "⯎" +  numT(pc_emission_upgrade_price) );
      pc_emission_label.text('[1-'+numT(pc_emission*pc_emission_boost)+']');

      factoryState();

    });

    //cc
    chief_check_toggle.click(function(){

      PlayAudio(2);

      ccSwitch();

    });
    chief_warp_check_toggle.click(function(){

      PlayAudio(2);

      if(chief_warp_check==0){
        chief_warp_check=1;
        chief_warp_check_toggle.removeClass('button3gray').addClass('button3blue').text("ON");
      }else{
        chief_warp_check=0;
        chief_warp_check_toggle.removeClass('button3blue').addClass('button3gray').text("OFF");
      }

    });

    //synchrotron
    gambling_collect_upgrade.click(function(){

      if(magnetron_state!=1 && gambling_collect_flag==0){//if magnetron is either running or armed, we can collect

        PlayAudio(2);

        gambling_collect_flag=1;//just collected, cannot collect anymore
        gambling_collect_upgrade.removeClass('selected11').addClass('button11');

        if(gambling_choice.length<3 || !gambling_choice){
          gambling_choice.push(magnetron_choice);
        }

        let q1=magnetron_probability_game_set[gambling_choice[0]];
        let q2=magnetron_probability_game_set[gambling_choice[1]];if(!q2){q2='';}
        let q3=magnetron_probability_game_set[gambling_choice[2]];if(!q3){q3='';}

        gambling_symbol_label.html( '<span class="blue" style="visibility:visible">'+q1+q2+q3+'</span>');

        if(gambling_choice.length==3){

          PlayAudio(8);

          if(gambling_choice[0]==gambling_choice[1] && gambling_choice[1]==gambling_choice[2]){gambling_boosts+=5;}
          else{gambling_boosts+=1;}

          if(gambling_choice[0]==2 && gambling_choice[1]==4 && gambling_choice[2]==5){

            secret1_flag=1;
            foundry_waste_limit=750;
            foundry_waste_label.text(foundry_waste+"/"+foundry_waste_limit);

          }

          gambling_boosts_label.text('['+gambling_boosts+']');
          button2Enable(gambling_boosts_upgrade);

          gambling_choice=[];
          gambling_symbol_label.html( '<span class="blue" style="visibility:hidden">⍙</span>');

        }

      }
    });
    gambling_boosts_upgrade.click(function(){

      //the overdrive logic is a copy of overdrive_upgrade.click(), so any changes made there should be done here

      PlayAudio(5);

      moneyCalc(money_limit);

      button2Disable(overdrive_upgrade);

      overdrive_price=total_money*ogr;
      overdrive_label.text("⌬"+numT(total_money)+"/⌬"+numT(overdrive_price));

      InventoryUpdate();

      //reducing the amount of boosts
      gambling_boosts--;

      //updating gambling_block specific UI
      gambling_boosts_label.text('['+gambling_boosts+']');
      if(gambling_boosts>0){button2Enable(gambling_boosts_upgrade);}
      else{button2Disable(gambling_boosts_upgrade);}

    });

  });//document.ready






  function Init(){

    //PLAYER
    money=0;
    total_money=0;//we reset total_money, but all_time_money is preserved from previous cycles
    antimatter=0;antimatter_label.text(numT(antimatter));//resetting antimatter, which is the amount of antimatter generated this cycle;
    prestige_flag=0;

    overdrive_label.text("⌬"+numT(total_money)+"/⌬"+numT(overdrive_price));

    //research lab
    actions_cycle=0;//currently unused
    bonus_multiplier=1;//resetting the bonus multiplier

    last_animal=999;//default value, to not trigger any lifeform boxes
    buildLifeformsCollection();

    eepc_panel.text("⌬0");
    if(powerplants_multiplier>1){
      aa_panel.html("x" + numT(prestige_multiplier) + '<span style="color:#aaa">x' + numT(powerplants_multiplier) + '</span');
    }else{
      aa_panel.text("x" + numT(prestige_multiplier));
    }
    rlab_panel.text( "+" +  numT( (bonus_multiplier+animal1_bonus_multiplier-1)*100 ) + "%" );

    //GENERATOR PRICES (SUPPLY LIMITS)
    one_price=1;button_one.text(numT(one_price));
    two_price=0;button_two.text(numT(two_price));
    three_price=0;button_three.text(numT(three_price));
    four_price=0;button_four.text(numT(four_price));

    //each next is x100. The prestige_multiplier and powerplants_multiplier are only ever applied here
    one_init_multiplier=1*prestige_multiplier*powerplants_multiplier;
    two_init_multiplier=100*prestige_multiplier*powerplants_multiplier;
    three_init_multiplier=10000*prestige_multiplier*powerplants_multiplier;
    four_init_multiplier=1000000*prestige_multiplier*powerplants_multiplier;

    //MULTIPLIERS
    one_multiplier=one_init_multiplier;one_effectiveness_label.text("["+numT(one_multiplier)+"]");
    two_multiplier=two_init_multiplier;two_effectiveness_label.text("["+numT(two_multiplier)+"]");
    three_multiplier=three_init_multiplier;three_effectiveness_label.text("["+numT(three_multiplier)+"]");
    four_multiplier=four_init_multiplier;four_effectiveness_label.text("["+numT(four_multiplier)+"]");

    one_recent_money=0;
    two_recent_money=0;
    three_recent_money=0;
    four_recent_money=0;

    supply_base=1;
    one_price_label.text("["+supply_base+"]");
    two_price_label.text("["+supply_base+"]");
    three_price_label.text("["+supply_base+"]");
    four_price_label.text("["+supply_base+"]");

    //pbs
    progress3(0,pb_one_upgrade_supply_limit,pb_one_supply_indicator,"+1");
    progress3(0,pb_one_upgrade_effectiveness,pb_one_effectiveness_indicator,"+"+numT(one_init_multiplier));

    progress3(0,pb_two_upgrade_supply_limit,pb_two_supply_indicator,"+1");
    progress3(0,pb_two_upgrade_effectiveness,pb_two_effectiveness_indicator,"+"+numT(two_init_multiplier));

    progress3(0,pb_three_upgrade_supply_limit,pb_three_supply_indicator,"+1");
    progress3(0,pb_three_upgrade_effectiveness,pb_three_effectiveness_indicator,"+"+numT(three_init_multiplier));

    progress3(0,pb_four_upgrade_supply_limit,pb_four_supply_indicator,"+1");
    progress3(0,pb_four_upgrade_effectiveness,pb_four_effectiveness_indicator,"+"+numT(four_init_multiplier));

    //generator strips
    one_x=0;two_x=0;three_x=0;four_x=0;
    g_electric.css('background-image', 'url("img/g_electric2.png")');
    g_plasma.css('background-image', 'url("img/g_plasma2.png")');
    g_nuclear.css('background-image', 'url("img/g_nuclear2.png")');
    g_gravity.css('background-image', 'url("img/g_gravity2.png")');

    //LOOPS
    clearInterval(one_interval);
    clearInterval(two_interval);
    clearInterval(three_interval);
    clearInterval(four_interval);

    //UPGRADES DEFAULTS
    money_limit=money_limit_init;money_limit_label.text("["+numT(money_limit)+"]");
    one_supply=0;one_supply_label.text(one_supply);
    two_supply=0;two_supply_label.text(two_supply);
    three_supply=0;three_supply_label.text(three_supply);
    four_supply=0;four_supply_label.text(four_supply);

    one_generation=1;one_generation_label.text("Generation II");one_name_label.text("Electric");
    two_generation=1;two_generation_label.text("Generation II");two_name_label.text("Plasma");
    three_generation=1;three_generation_label.text("Generation II");three_name_label.text("Nuclear");
    four_generation=1;four_generation_label.text("Generation II");four_name_label.text("Gravity");
    one_generation_block.show();
    two_generation_block.show();
    three_generation_block.show();
    four_generation_block.show();

    one_effectiveness_block.show();
    two_effectiveness_block.show();
    three_effectiveness_block.show();
    four_effectiveness_block.show();

    one_ratio_label.text("0.0%");
    two_ratio_label.text("0.0%");
    three_ratio_label.text("0.0%");
    four_ratio_label.text("0.0%");

    sup_one_label.text("x5");
    sup_two_label.text("x5");
    sup_three_label.text("x5");
    sup_four_label.text("x5");

    //generator prices (each next is x1000)

    one_upgrade_supply_limit_price=10;one_upgrade_supply_limit.text("⌬" + numT(one_upgrade_supply_limit_price));
    one_upgrade_effectiveness_price=10;one_upgrade_effectiveness.text("⌬" + numT(one_upgrade_effectiveness_price));
    one_upgrade_effectiveness.css("visibility", "visible");

    two_upgrade_supply_limit_price=one_upgrade_supply_limit_price*500;two_upgrade_supply_limit.text("⌬" + numT(two_upgrade_supply_limit_price));
    two_upgrade_effectiveness_price=one_upgrade_effectiveness_price*500;two_upgrade_effectiveness.text("⌬" + numT(two_upgrade_effectiveness_price));
    two_upgrade_effectiveness.css("visibility", "visible");

    three_upgrade_supply_limit_price=two_upgrade_supply_limit_price*500;three_upgrade_supply_limit.text("⌬" + numT(three_upgrade_supply_limit_price));
    three_upgrade_effectiveness_price=two_upgrade_effectiveness_price*500;three_upgrade_effectiveness.text("⌬" + numT(three_upgrade_effectiveness_price));
    three_upgrade_effectiveness.css("visibility", "visible");

    four_upgrade_supply_limit_price=three_upgrade_supply_limit_price*500;four_upgrade_supply_limit.text("⌬" + numT(four_upgrade_supply_limit_price));
    four_upgrade_effectiveness_price=three_upgrade_effectiveness_price*500;four_upgrade_effectiveness.text("⌬" + numT(four_upgrade_effectiveness_price));
    four_upgrade_effectiveness.css("visibility", "visible");

    //tank prices
    if(tank_toggle_flag[0]==1){
      one_tank_toggle.html('[1/<span class="blue">full</span>]');
      setTankPrice(0);
    }else{
      power_price_check[0]=one_upgrade_effectiveness_price;
    }
    if(tank_toggle_flag[1]==1){
      two_tank_toggle.html('[1/<span class="blue">full</span>]');
      setTankPrice(1);
    }else{
      power_price_check[1]=two_upgrade_effectiveness_price;
    }
    if(tank_toggle_flag[2]==1){
      three_tank_toggle.html('[1/<span class="blue">full</span>]');
      setTankPrice(2);
    }else{
      power_price_check[2]=three_upgrade_effectiveness_price;
    }
    if(tank_toggle_flag[3]==1){
      four_tank_toggle.html('[1/<span class="blue">full</span>]');
      setTankPrice(3);
    }else{
      power_price_check[3]=four_upgrade_effectiveness_price;
    }

    //generator generations (each next is x1000)
    one_upgrade_generation_price=four_upgrade_effectiveness_price*1000;one_upgrade_generation.text("⌬" + numT(one_upgrade_generation_price));
    two_upgrade_generation_price=one_upgrade_generation_price*1000;two_upgrade_generation.text("⌬" + numT(two_upgrade_generation_price));
    three_upgrade_generation_price=two_upgrade_generation_price*1000;three_upgrade_generation.text("⌬" + numT(three_upgrade_generation_price));
    four_upgrade_generation_price=three_upgrade_generation_price*1000;four_upgrade_generation.text("⌬" + numT(four_upgrade_generation_price));

    money_limit_upgrade_price=money_limit_upgrade_price_init;money_limit_upgrade.text("⌬" + numT(money_limit_upgrade_price));

    //UPGRADE STAGES
    one_upgrade_supply_limit_stage=0;
    one_upgrade_effectiveness_stage=0;
    one_upgrade_effectiveness_level=1;//after a certain amount does x5 and x100

    two_upgrade_supply_limit_stage=0;
    two_upgrade_effectiveness_stage=0;
    two_upgrade_effectiveness_level=1;

    three_upgrade_supply_limit_stage=0;
    three_upgrade_effectiveness_stage=0;
    three_upgrade_effectiveness_level=1;

    four_upgrade_supply_limit_stage=0;
    four_upgrade_effectiveness_stage=0;
    four_upgrade_effectiveness_level=1;

    //GENERATOR BUTTONS
    button1Enable(button_one);button_one.attr("class", "button1_genRunning");
    button1Disable(button_two);
    button1Disable(button_three);
    button1Disable(button_four);

    //CONTROL PANEL
    one_tab.css("background-color","#30b8d0");one_tab.css("color","#1a1a1a");
    two_tab.css("background-color","#1a1a1a");two_tab.css("color","#999");
    three_tab.css("background-color","#1a1a1a");three_tab.css("color","#999");
    four_tab.css("background-color","#1a1a1a");four_tab.css("color","#999");

    one_tab_contents.show();
    two_tab_contents.hide();
    three_tab_contents.hide();
    four_tab_contents.hide();

    //MACHINES
    //Machine states (only those that are not set through prestige; engden_state and lscanner_state are handled later)
    battery_state=0;
    magnetron_state=0;
    gambling_state=0;
    foundry_state=0;
    radiator_state=0;
    pc_state=0;

    //BATTERY
    battery_unlock_upgrade_price=Math.pow(10,13);battery_unlock_upgrade.text("⌬" + numT(battery_unlock_upgrade_price));

    //ENGDEN
    //resetting to default values


    if(engden_state==0){
      auxiliary_effectiveness=1;//this is required, since it is part of moneyCalc()
      auxiliary_effectiveness1=0;
      auxiliary_effectiveness2=0;
      engden_title.hide();
      engden_block.hide();
      rank_label.text("[Operator]");
    }else{
      engden_title.show();
      engden_block.show();
      rank_label.text("[Engineer]");
    }

    if(lscanner_state==1){
      lscanner_title.show();
      lscanner_block.show();
      rank_label.text("[Floor Admin]");
    }else{
      lscanner_title.hide();
      lscanner_block.hide();
    }

    if(chief==1){
      rank_label.text("[Chief Engineer]");
      chief_cc_block.show();
      ccSetup();

      //so that the auto-buy ui elements don't show, but the prestige items are marked as "sold"
      warp_panel2_upgrade_flag=2;
      warp_panel3_upgrade_flag=2;
      warp_panel4_upgrade_flag=2;
    }else{
      chief_cc_block.hide();
      //these variables can be potentially left over from previous cycles, so we make sure they are reset here
      chief_check=0;
      chief_warp_check=0;
    }

    //Init codes of the machines themselves are currently in each of the unlock events, since initially all machines are hidden and/or locked. Here we list those variables that affect the generators, so that they are reset after prestige
    battery_block.hide();
    battery_lock_block.show();
    magnetron_block.hide();
    magnetron_lock_block.hide();
    gambling_block.hide();
    radiator_block.hide();
    radiator_lock_block.hide();
    foundry_block.hide();
    foundry_lock_block.hide();
    pc_block.hide();
    pc_lock_block.hide();
    battery_charge_percentage=0;//has to be 0 by default, because it is part of the moneyCalc() function all the time;
    magnetron_multiplier=1;//has to be 1 by default, because it is part of the moneyCalc() formula all the time;
    pb_money_indicator.css("background-color","#c149ff");//and setting the money indicator back to its normal color
    radiator_one_multiplier=1;//resetting the radiator
    radiator_two_multiplier=1;
    radiator_three_multiplier=1;
    radiator_four_multiplier=1;

    //OPTIMIZATIONS
    active_tab_flag=1;
    one_ratios_flag=1;//1 by default, so that starting the generator recalculates the ratios
    two_ratios_flag=1;
    three_ratios_flag=1;
    four_ratios_flag=1;

    //PRESTIGE
    button2Enable(prestige_upgrade);

    //researchList
    researchList={
      price:['500','1000','2000','4000','8000','16000','32000','64000'],
      effect:['1','2','2','1','2','2','1','3'],
        type:['1','1','1','1','2','1','1','1']
    };
    research_playhead=7;
    buildResearchList();
    researchSeed=getRandomInt(0,999999);
    buildRNG(researchSeed);

    //updating UI with the established values
    InventoryUpdate();
    nPCC();//updating the positron cubes number

    //starting the Grand Telescope
    startTelescope();

    //hiding UI elements
    closeWindows();

    //we actually don't save here, reason being - I want to give the player a chance to reload after a prestige reboot in case they made a mistake. This means that when you prestige (meaning, presss the "Reboot" button), you will now actually have 2 full minutes to decide to revert your prestige upgrades
    //SaveGame();

    save_timer_label.text(120);
    button3Disable(save_upgrade);
    SaveLoop();

  }

  function moneyCalc(m_inc){
    /*this is where we properly add m_inc - money increment*/
    //find the valid increment which does not go beyond money_limit

    /*
    But this is also a sort of "main game loop", because almost everything happens if the generators are running. But because InventoryUpdate() is a function habitually called from all sorts of places, using moneyCalc() is safer in cases where you really want to make sure the event runs within generator cycles

    All the machine events, for example, are tied to battery charging and are triggered from this function. A lot of generator functions are called here as well
    */

    var all_multipliers = magnetron_multiplier*auxiliary_effectiveness*(bonus_multiplier+animal1_bonus_multiplier)*am_radiation_multiplier;

    m_inc=m_inc*all_multipliers;//where various multipliers are applied - Magnetron, Engineering Den, Research Lab and lifeform upgrade

    /*
    The reason why we're doing money=money_limit and not simply money+=m_inc like in other places, is because I've found that with higher order numbers precision will begin to lapse, probably due to Math.floor being applied in various places. Which will eventually lead to money never being equal to money_limit. Therefore, it's safer to simply set money to money_limit.
    */
    if( money+m_inc>money_limit ){
      m_inc=money_limit-money;money=money_limit;
    }else{money+=m_inc;}

    total_money+=m_inc;all_time_money+=m_inc;

    //charging the battery
    if(battery_charge_percentage>0 && money!=money_limit){//we don't charge if the generators are running idle

      let charge_increment=m_inc * (battery_charge_percentage*0.01);//100
      //removing that amount from the generated energy (money)
      money-=charge_increment;
      //and then multiplying by 0.0000001 (normalizing for battery)
      charge_increment = Math.floor( charge_increment*animal7_battery_charge_multiplier*0.0000001 );


      //adding it to the battery's charge
      charge+=charge_increment;
      if(charge>charge_limit){charge=charge_limit;}

        //calculating effectiveness by taking a percentage of all money generated by generator, otherwise the effectiveness is going to flash from one value to the other, since in reality almost never would the charges from different generators arrive at the same time
        let all = Math.floor( ((one_recent_money + two_recent_money + three_recent_money + four_recent_money) * all_multipliers * (battery_charge_percentage/100)*0.0000001*animal7_battery_charge_multiplier) );
        battery_effectiveness_label.text("[⑂"+numT(all)+"]");

      ChargeUpdate();

      //Calling various machines. This is done here and not in ChargeUpdate(), because ChargeUpdate() is also called when the player is buying factory upgrades and we don't want to trigger these checks in those cases

      //Battery auto buy charge limit upgrade
      //in the past it had the condition charge-charge_limit_upgrade_price>=0, but I removed it, since at no point should there be no funds to buy an upgrade at charge=charge_limit
      if( (engden_state==1 || chief_check==1) && charge==charge_limit){
        autoChargeLimit();
      }

      //Magnetron
      if(magnetron_state==1){//this is called only when magnetron is unlocked (not 0) and not armed (not 2)
        magnetronRequest();
      }

      //Foundry (running and heating up)
      if(foundry_state==1 && battery_charge_percentage>=10){//foundry furnace heating up

        //moneyCalc() cycles through the foundry_heating_stage, which loops 0-1-2-3;
        //heating up happens at 3
        //components production happens at 2
        if(foundry_production_flag==1 && foundry_heating_stage==2){//if foundry is in production mode
          foundry_components+=Math.floor(foundry_components_multiplier*animal6_components_multiplier*foundry_components_multiplier_qm);
          foundry_components_label.text("⯎" + numT(foundry_components));
          if(foundry_temperature<0){foundry_temperature=0;}

          //waste management
          if(foundry_waste<foundry_waste_limit){
            foundry_waste+=1;
            if(foundry_waste>=foundry_waste_limit){
              foundry_waste=foundry_waste_limit;
              button1Enable(foundry_recycle_upgrade);
            }
            foundry_waste_label.text(foundry_waste+"/"+foundry_waste_limit);
          }




        }


        if(foundry_heating_stage==3){
          foundry_temperature+=battery_charge_percentage-9;
            if(foundry_temperature>=3000 && foundry_production_flag==0){
              foundry_production_flag=1;
            }
            if(foundry_temperature>3422){
              foundry_temperature = 3422 - getRandomInt(0,23);
            }
          furnace_screen.text(foundry_temperature+" °C");
        }

        foundry_heating_stage++;if(foundry_heating_stage==4){foundry_heating_stage=0;}

      }//foundry furnace heating up

      //Particle Collector
      if(pc_state==1){
        pc_seconds_amount++;
              if(pc_seconds_amount%15==0){
                if(pc_seconds_amount>=60){pc_seconds_amount=0;}

                  let p_inc=getRandomInt(1,pc_emission*pc_emission_boost);

                  positrons+=p_inc;all_time_positrons+=p_inc;
                  nPCC();
                  pc_positrons_label.text('['+numT(all_time_positrons)+'/'+numT(nextPositronCubesCost)+']');

              }//if(pc_seconds_amount>=60)
        const secondsDegrees = ((pc_seconds_amount / 60) * 360) + 90;
        pc_seconds.css('transform', 'rotate(' + secondsDegrees + 'deg)');
      }


    }//charging the battery

    //Engineering Den
    if(warp_challenge2_flag<2){couplingsWear();}

    //generators auto-buy
    if(buymax_toggle_flag==1){
      //this spends money and in everything apart from new generation restarts generators if money==money_limit
      autoPowerUpgrade();
    }

    //rlab auto-buy
    //I am adding a money check here so that we don't do anything in cases when there's not enough money, which is going to be the majority of cases
    if(rlab_autobuy_toggle_flag==1 && money-researchList.price[0]>=0){

      //this check ensures that if the power tank is full, we restart the generators, since we are going to use that money on at least one rlab upgrade
      if(money==money_limit){restartGenerators();}

      while(money-researchList.price[0]>=0){
        bbCalc(0);//buying the first upgrade in the line
      }



      bbUI();

    }

  }

  function One(){

    var num=0;
    var tick=0;

    one_interval=setInterval(function() {

      num++;

      if(num>=6){

        moneyCalc(one_multiplier*radiator_one_multiplier);
        one_recent_money=one_multiplier*radiator_one_multiplier;if(one_ratios_flag==1){one_ratios_flag=0;GeneratorRatios();}
        one_supply-=1;one_supply_label.text(numT(one_supply));

        InventoryUpdate();

        if(audio_mute_one==0){
          if(time_fundamental==1){PlayAudio(4);}
          else if(time_fundamental==0.5){tick++;if(tick==2){PlayAudio(4);tick=0;}}
          else{tick++;if(tick==4){PlayAudio(4);tick=0;}}
        }

        num=0;

        if(one_supply<=0 || money==money_limit){
          clearInterval(one_interval);
          one_supply=0;one_supply_label.text(numT(one_supply));
          button1Enable(button_one);
          if(chief_check==1){button_one.trigger( "click");}
        }

      }

        //generator belt
        if(money!=money_limit){
          one_x+=1;g_electric.css('background-position', + one_x + 'px 0px');
        }


    }, 80*time_fundamental);
  }
  function Two(){

    var num=0;
    var tick=0;

    two_interval=setInterval(function() {

      num++;


      if(num>=6){

        moneyCalc(two_multiplier*radiator_two_multiplier);
        two_recent_money=two_multiplier*radiator_two_multiplier;if(two_ratios_flag==1){two_ratios_flag=0;GeneratorRatios();}
        two_supply-=1;two_supply_label.text(numT(two_supply));

        InventoryUpdate();

        if(audio_mute_two==0){
          if(time_fundamental==1){PlayAudio(4);}
          else if(time_fundamental==0.5){tick++;if(tick==2){PlayAudio(4);tick=0;}}
          else{tick++;if(tick==4){PlayAudio(4);tick=0;}}
        }

        //low-frequency hum of the Plasma generator
        if(getRandomInt(1,1000)==3){PlayAudio(9);}

        num=0;

        if(two_supply<=0 || money==money_limit){
          clearInterval(two_interval);
          two_supply=0;two_supply_label.text(numT(two_supply));
          button1Enable(button_two);
          if(chief_check==1){button_two.trigger( "click");}
        }

      }

      if(money!=money_limit){
        two_x+=1;g_plasma.css('background-position', + two_x + 'px 0px');
      }

    }, 80*time_fundamental);
  }
  function Three(){

    var num=0;
    var tick=0;

    three_interval=setInterval(function() {

      num++;


      if(num>=6){

        moneyCalc(three_multiplier*radiator_three_multiplier);
        three_recent_money=three_multiplier*radiator_three_multiplier;if(three_ratios_flag==1){three_ratios_flag=0;GeneratorRatios();}
        three_supply-=1;three_supply_label.text(numT(three_supply));

        InventoryUpdate();

        if(audio_mute_three==0){
          if(time_fundamental==1){PlayAudio(4);}
          else if(time_fundamental==0.5){tick++;if(tick==2){PlayAudio(4);tick=0;}}
          else{tick++;if(tick==4){PlayAudio(4);tick=0;}}
        }

        num=0;

        if(three_supply<=0 || money==money_limit){
          clearInterval(three_interval);
          three_supply=0;three_supply_label.text(numT(three_supply));
          button1Enable(button_three);
          if(chief_check==1){button_three.trigger( "click");}
        }

      }

      if(money!=money_limit){
      three_x+=1;g_nuclear.css('background-position', + three_x + 'px 0px');
      }

    }, 80*time_fundamental);
  }
  function Four(){

    var num=0;
    var tick=0;

    four_interval=setInterval(function() {

      num++;


      if(num>=6){

        moneyCalc(four_multiplier*radiator_four_multiplier);
        four_recent_money=four_multiplier*radiator_four_multiplier;if(four_ratios_flag==1){four_ratios_flag=0;GeneratorRatios();}
        four_supply-=1;four_supply_label.text(numT(four_supply));

        InventoryUpdate();

        if(audio_mute_four==0){
          if(time_fundamental==1){PlayAudio(4);}
          else if(time_fundamental==0.5){tick++;if(tick==2){PlayAudio(4);tick=0;}}
          else{tick++;if(tick==4){PlayAudio(4);tick=0;}}
        }

        num=0;

        if(four_supply<=0 || money==money_limit){
          clearInterval(four_interval);
          four_supply=0;four_supply_label.text(numT(four_supply));
          button1Enable(button_four);
          if(chief_check==1){button_four.trigger( "click");}
        }

      }

      if(money!=money_limit){
      four_x+=1;g_gravity.css('background-position', + four_x + 'px 0px');
      }

    }, 80*time_fundamental);
  }

  function InventoryUpdate(){

    nAC();//nextAntimatterCost

    ultimate_ratio=antimatter/antimatter_cubes*25;

    storeState();
    progress_money();

    //this is here, because I want the progress bar to first get filled and then get reduced
    //placing this in moneyCalc() would lead to the progress bar simply never filling up
    if(night_shift==1 && money==money_limit){autoPowerLimit();}

    overdrive_label.text("⌬"+numT(total_money)+"/⌬"+numT(overdrive_price));

    //stats go here, after all checks, so that in case something gets updated later, an incorrect value does not flash here, like when antimatter is not yet set to antimatter++;
    if(stats_window_flag==1){
      var tillNextAntimatter_value=nextAntimatterCost - all_time_money;
        if(tillNextAntimatter_value<0){tillNextAntimatter_value=0;}
        tillNextAntimatter_label.text("⌬" + numT( tillNextAntimatter_value ) );
      all_time_money_label.text("⌬" + numT(all_time_money));
      total_money_label.text("⌬" + numT(total_money));
      ac_stock_label.text(numT(antimatter_cubes-antimatter_cubes_spent));
    }

    if(lscanner_state==1){//repopulation
      if(ultimate_ratio<100){repopulation_label.text( numT(ultimate_ratio) );}
      else{repopulation_label.text( 100 );}
    }

    //automatic prestige
    if(chief_warp_check==1){
      if(antimatter_cubes==0 && antimatter>=5){//first time prestige when you've got 5 antimatter
        ccPrestige();
      }
      else if (antimatter_cubes>0 && ultimate_ratio>=100){
        //update: a change was suggested to have the warps be less frequent even before lifeforms scanner is unlocked; this seems fine to me, so I am changing that. I am commenting out the previous condition, just in case I would want to come back to that
          //use the ultimate ratio once the Lifeforms Scanner is on, so that it is properly repopulated
          //if(lscanner_state==1 && ultimate_ratio>=100){ccPrestige();}
          //use the quarter of the ultimate ratio before that, since this is a more optimal strategy (imho)
          //else if(lscanner_state==0 && ultimate_ratio>=25){ccPrestige();}
        ccPrestige();
      }
    }

  }

  function ChargeUpdate(){
    factoryState();
    progress_battery();
  }

  function storeState(){

    if(active_tab_flag==1){

      if(money-power_price_check[0]>=0){button1Enable(one_upgrade_effectiveness);}
      else{button1Disable(one_upgrade_effectiveness);}

      if(money-one_upgrade_supply_limit_price>=0){button1Enable(one_upgrade_supply_limit);}
      else{button1Disable(one_upgrade_supply_limit);}

      if(money-one_upgrade_generation_price>=0){button1Enable(one_upgrade_generation);}
      else{button1Disable(one_upgrade_generation);}
    }

    if(active_tab_flag==2){
      if(money-power_price_check[1]>=0){button1Enable(two_upgrade_effectiveness);}
      else{button1Disable(two_upgrade_effectiveness);}

      if(money-two_upgrade_supply_limit_price>=0){button1Enable(two_upgrade_supply_limit);}
      else{button1Disable(two_upgrade_supply_limit);}

      if(money-two_upgrade_generation_price>=0){button1Enable(two_upgrade_generation);}
      else{button1Disable(two_upgrade_generation);}
    }

    if(active_tab_flag==3){
      if(money-power_price_check[2]>=0){button1Enable(three_upgrade_effectiveness);}
      else{button1Disable(three_upgrade_effectiveness);}

      if(money-three_upgrade_supply_limit_price>=0){button1Enable(three_upgrade_supply_limit);}
      else{button1Disable(three_upgrade_supply_limit);}

      if(money-three_upgrade_generation_price>=0){button1Enable(three_upgrade_generation);}
      else{button1Disable(three_upgrade_generation);}
    }

    if(active_tab_flag==4){
      if(money-power_price_check[3]>=0){button1Enable(four_upgrade_effectiveness);}
      else{button1Disable(four_upgrade_effectiveness);}

      if(money-four_upgrade_supply_limit_price>=0){button1Enable(four_upgrade_supply_limit);}
      else{button1Disable(four_upgrade_supply_limit);}

      if(money-four_upgrade_generation_price>=0){button1Enable(four_upgrade_generation);}
      else{button1Disable(four_upgrade_generation);}
    }

    if(battery_state==0){
      if(money-battery_unlock_upgrade_price>=0){
        button1Enable(battery_unlock_upgrade);
        if(chief_check==1){
          battery_unlock_upgrade.trigger("click");
        }
      }
      else{button1Disable(battery_unlock_upgrade);}
    }

    if(money-money_limit_upgrade_price>=0){button1Enable(money_limit_upgrade);}
    else{button1Disable(money_limit_upgrade);}

    if(total_money-overdrive_price>=0){
      button2Enable(overdrive_upgrade);
      overdrive_price=total_money;
      if(chief_check==1){overdrive_upgrade.trigger( "click");}
    }
    else{button2Disable(overdrive_upgrade);}

    researchState();

  }
  function factoryState(){

    if(magnetron_state>0){

      if(charge-magnetron_multiplier_upgrade_price>=0){
        button1Enable(magnetron_multiplier_upgrade);
          if(chief_check==1 && device_magnetron_multiplier<warp_max_magnetron_multiplier){
            magnetron_multiplier_upgrade.trigger("click");
          }
      }
      else{button1Disable(magnetron_multiplier_upgrade);}

      if(charge-magnetron_duration_upgrade_price>=0){
        button1Enable(magnetron_duration_upgrade);
          if(chief_check==1 && magnetron_duration<warp_max_magnetron_duration){
            magnetron_duration_upgrade.trigger("click");
          }
      }
      else{button1Disable(magnetron_duration_upgrade);}

    }else{
      if(charge-magnetron_unlock_upgrade_price>=0){
        button1Enable(magnetron_unlock_upgrade);
        if(chief_check==1){
          magnetron_unlock_upgrade.trigger("click");
        }
      }
      else{button1Disable(magnetron_unlock_upgrade);}
    }

    if(radiator_state==0){
      if(foundry_components-radiator_unlock_upgrade_price>=0){button1Enable(radiator_unlock_upgrade);}
      else{button1Disable(radiator_unlock_upgrade);}
    }

    if(foundry_state==1){

      if(charge-foundry_components_cycle_upgrade_price>=0){button1Enable(foundry_components_cycle_upgrade);}
      else{button1Disable(foundry_components_cycle_upgrade);}

    }else{
      if(charge-foundry_unlock_upgrade_price>=0){button1Enable(foundry_unlock_upgrade);}
      else{button1Disable(foundry_unlock_upgrade);}
    }

    if(pc_state==1){

      if(foundry_components-pc_emission_upgrade_price>=0){button1Enable(pc_emission_upgrade);}
      else{button1Disable(pc_emission_upgrade);}

    }else{
      if(foundry_components-pc_unlock_upgrade_price>=0){button1Enable(pc_unlock_upgrade);}
      else{button1Disable(pc_unlock_upgrade);}
    }

    if(charge-charge_limit_upgrade_price>=0){button1Enable(charge_limit_upgrade);}
    else{button1Disable(charge_limit_upgrade);}

    if(battery_charge_percentage_limit<100 && charge-charge_throughput_upgrade_price>=0){button1Enable(charge_throughput_upgrade);}
    else{button1Disable(charge_throughput_upgrade);}

  }

  function prestigeOk(){
    //LOOPS
    clearInterval(telescope_timer);telescope_timer=null;//stop the telescope
    clearInterval(magnetron_interval);magnetron_interval=null;//stop the magnetron
    clearInterval(save_timer);button3Disable(save_upgrade);save_timer=null;//stop the save timer, so that if someone reloads at this point, we don't run into problems
    clearInterval(furnace_cooling_timer);furnace_cooling_timer=null;

    stopGenerators();

    closeWindows();
    all.hide();

    //if the player rebooted too quickly, lifeforms become rare for that run
    if( ultimate_ratio<100 ){recency=1;}
    else{recency=0;}//recency=0 is what you want

    //challenges

    if(antimatter==555 && warp_challenge2_flag==0){
      warp_challenge2_flag=1;
    }
    if(all_time_positron_cubes>=555 && warp_challenge3_flag==0){
      warp_challenge3_flag=1;
    }
    if(one_generation==generation_limit && two_generation==generation_limit && three_generation==generation_limit && four_generation==generation_limit && warp_challenge4_flag==0){
      warp_challenge4_flag=1;
    }

    //this sets buff_challenge1_flag to failed, since this is a warpless challenge
    if(buff_challenge1_flag==0){buff_challenge1_flag=3;}

    antimatter_cubes+=antimatter;antimatter=0;//converting antimatter to cubes;i reset antimatter here, although Init does it as well


    if(antimatter_cubes>0){prestige_multiplier=antimatter_cubes;}
    else prestige_multiplier=1;

    //the more antimatter_cubes we created, the farther the first overdrive price is going to be
    if(antimatter_cubes*powerplants_multiplier<100){//before we reach full automation, we have more overdrives

      //this adds +500 for each generated antimatter cube:
      //0 or 1 means 1000
      //2 means 1500
      //3 means 2000 and so on
      if(antimatter_cubes>0){overdrive_price=1000+(antimatter_cubes-1)*500;}
      else{overdrive_price=1000;}

    }else{//in this mode overdrives become much rarer

      overdrive_price=all_time_money/1000;

      //we also begin to provide a long money limit
      //removing this even with all the auto-buy modes leads to unwanted behavior, because in the beginning the generators appear frozen as the power limit auto-buys constantly, stopping and restarting the generators
      money_limit_init=all_time_money/10000;
      money_limit_upgrade_price_init=all_time_money/50000;

    }


    //additionally, the rate of overdrive price growth also increases
    if(antimatter_cubes<=100){
      ogr=2+antimatter_cubes*0.05;
    }else{
      ogr=5;
    }

    if(lscanner_state==1){
      ogr=10;//this is also set in the floor admin warp upgrade
    }

    prestige_flag=1;//so that we can buy upgrades
    prestigeInit();
    reboot_backtogame.hide();
    reboot_upgrade.show();
    prestige_board.show();
  }
  function rebootOk(){
    prestige_board.hide();
    all.show();

    //autobuy_purse provides values to these flags from the previous iteration, saved temporarily in stopGenerators()
    buymax_toggle_flag=parseInt(autobuy_purse[0]);
    rlab_autobuy_toggle_flag=parseInt(autobuy_purse[1]);
    night_shift=parseInt(autobuy_purse[2]);

    //resetting game
    Init();
  }
  function prestigeState(){

    var ac_owned=antimatter_cubes-antimatter_cubes_spent;//getting the available cubes
    ac_owned_label.text("["+numT(ac_owned)+"]");

    //all available cubes
    var am_text;
    if(antimatter_cubes==0){am_text="x1";}else{am_text="x"+numT(antimatter_cubes);}
    ac_all_label.text(am_text);

    //setting up prices
    all_button8s.text("▣" + numT(warp_price));

    //marking as sold
    if(warp_max_magnetron_duration==120){warp_magnetron_duration_upgrade.text("Sold");button8Disable(warp_magnetron_duration_upgrade);}
    if(warp_max_magnetron_multiplier==20){warp_magnetron_multiplier_upgrade.text("Sold");button8Disable(warp_magnetron_multiplier_upgrade);}
    if(warp_magnetron_alerting==1){warp_magnetron_alerting_upgrade.text("Sold");button8Disable(warp_magnetron_alerting_upgrade);}

    if(warp_panel1_upgrade_flag==1){warp_panel1_upgrade.text("Sold");button8Disable(warp_panel1_upgrade);}
    if(warp_panel2_upgrade_flag>0){warp_panel2_upgrade.text("Sold");button8Disable(warp_panel2_upgrade);}
    if(warp_panel3_upgrade_flag>0){warp_panel3_upgrade.text("Sold");button8Disable(warp_panel3_upgrade);}
    if(warp_panel4_upgrade_flag>0){warp_panel4_upgrade.text("Sold");button8Disable(warp_panel4_upgrade);}



    //handling academy
    //hiding all buttons, but the first training
    warp_rank2_training1_upgrade.hide();
    warp_rank2_training2_upgrade.hide();
    //warp_rank1_upgrade.hide();
    warp_rank2_upgrade.hide();
    //evaluate academy progression in the right order
    if(engden_state==1){
      warp_rank1_upgrade.text("Sold");
      button8Disable(warp_rank1_upgrade);
      warp_rank2_training1_upgrade.show();
    }
    if(warp_rank2_training1_flag==1 || quantum_upgrade_flag[1]==1){
      warp_rank2_training1_upgrade.text("Sold");
      button8Disable(warp_rank2_training1_upgrade);
      warp_rank2_training2_upgrade.show();
      if(quantum_upgrade_flag[1]==1){warp_rank2_training1_upgrade.show();}
    }
    if(warp_rank2_training2_flag==1 || quantum_upgrade_flag[1]==1){
      warp_rank2_training2_upgrade.text("Sold");
      button8Disable(warp_rank2_training2_upgrade);
      warp_rank2_upgrade.show();
    }
    if(lscanner_state==1 || quantum_upgrade_flag[1]==1){
      warp_rank2_upgrade.text("Sold");
      button8Disable(warp_rank2_upgrade);
    }

    //Handling challenges
    if(warp_challenge1_flag==0){warp_challenge1_upgrade.text("Claim");button2Disable(warp_challenge1_upgrade);}
    else if(warp_challenge1_flag==1){warp_challenge1_upgrade.text("Claim");button2Enable(warp_challenge1_upgrade);}
    else if(warp_challenge1_flag==2){warp_challenge1_upgrade.text("Obtained").prop('disabled', true);warp_challenge1_upgrade.attr("class","button13");}

    if(warp_challenge2_flag==0){warp_challenge2_upgrade.text("Claim");button2Disable(warp_challenge2_upgrade);}
    else if(warp_challenge2_flag==1){warp_challenge2_upgrade.text("Claim");button2Enable(warp_challenge2_upgrade);}
    else if(warp_challenge2_flag==2){warp_challenge2_upgrade.text("Obtained").prop('disabled', true);warp_challenge2_upgrade.attr("class","button13");}

    if(warp_challenge3_flag==0){warp_challenge3_upgrade.text("Claim");button2Disable(warp_challenge3_upgrade);}
    else if(warp_challenge3_flag==1){warp_challenge3_upgrade.text("Claim");button2Enable(warp_challenge3_upgrade);}
    else if(warp_challenge3_flag==2){warp_challenge3_upgrade.text("Obtained").prop('disabled', true);warp_challenge3_upgrade.attr("class","button13");}

    if(warp_challenge4_flag==0){warp_challenge4_upgrade.text("Claim");button2Disable(warp_challenge4_upgrade);}
    else if(warp_challenge4_flag==1){warp_challenge4_upgrade.text("Claim");button2Enable(warp_challenge4_upgrade);}
    else if(warp_challenge4_flag==2){warp_challenge4_upgrade.text("Obtained").prop('disabled', true);warp_challenge4_upgrade.attr("class","button13");}

    if(buff_challenge1_flag==0 || buff_challenge1_flag==3){buff_challenge1_upgrade.text("Claim");button2Disable(buff_challenge1_upgrade);}
    else if(buff_challenge1_flag==1){buff_challenge1_upgrade.text("Claim");button2Enable(buff_challenge1_upgrade);}
    else if(buff_challenge1_flag==2){buff_challenge1_upgrade.text("Obtained").prop('disabled', true);buff_challenge1_upgrade.attr("class","button13");}

    if(buff_challenge2_flag==0 || buff_challenge2_flag==3){buff_challenge2_upgrade.text("Claim");button2Disable(buff_challenge2_upgrade);}
    else if(buff_challenge2_flag==1){buff_challenge2_upgrade.text("Claim");button2Enable(buff_challenge2_upgrade);}
    else if(buff_challenge2_flag==2){buff_challenge2_upgrade.text("Obtained").prop('disabled', true);buff_challenge2_upgrade.attr("class","button13");}

    //setting up quantum upgrades

    //hiding various service windows
    warp_qm_warning.hide();
    warp_qm_confirm.hide();

    //resetting the temp array
    quf_temp_bag=[0,0,0,0,0,0];
    warp_qm1_upgrade.removeClass("item3_selected").addClass("item3");
    warp_qm2_upgrade.removeClass("item3_selected").addClass("item3");
    warp_qm3_upgrade.removeClass("item3_selected").addClass("item3");
    warp_qm4_upgrade.removeClass("item3_selected").addClass("item3");
    warp_qm5_upgrade.removeClass("item3_selected").addClass("item3");
    warp_qm6_upgrade.removeClass("item3_selected").addClass("item3");

    if(warp_challenge1_flag==2){//if quantum upgrades are unlocked
      warp_qm_table.show();
      warp_qm_challenges.show();
      warp_warpless_table.show();

      if(warp_challenge3_flag==2){
        warp_solar_amp_title.text('Solar Amplifier II');
        warp_solar_amp_descr.text('Boosts Antimatter Amplifier by x3 and speed by 200%');
      }else{
        warp_solar_amp_title.text('Solar Amplifier');
        warp_solar_amp_descr.text('Boosts Antimatter Amplifier by x2');
      }

      if(warp_challenge4_flag==2){
        warp_zoo_keeper_title.text('Zoo Keeper II');
        warp_zoo_keeper_descr.text('Get 5 lifeforms from every Lifeform upgrade');
      }else{
        warp_zoo_keeper_title.text('Zoo Keeper');
        warp_zoo_keeper_descr.text('Get 2 lifeforms from every Lifeform upgrade');
      }

    }else{
      warp_qm_table.hide();
      warp_qm_challenges.hide();
      warp_warpless_table.hide();
    }

  }
  function prestigeInit(){

    //enable all buttons, so that in situations when a new powerplant is started all the warp upgrade buttons get properly reset (we don't need to reset challenge buttons, since they work beyond any prestige cycles)
    button8Enable(all_button8s);
    warp_view_warning.hide();

    prestigeState();

  }
  function resetPrestige(){
    //this function resets all prestige upgrades to their original values, as well as positrons, antimatter, animal upgrades and other upgrades that work across prestige cycles

    //prestige upgrades
    warp_price=5;
    //this is to compensate for the fact that auto warp upgrades are already provided
    //we multiply it, because a quantum upgrade can independently also raise the price
    if(chief==1){warp_price=warp_price*1000;}
    warp_price_rate=10;
      warp_panel1_upgrade_flag=1;
      warp_panel2_upgrade_flag=0;
      warp_panel3_upgrade_flag=0;
      warp_panel4_upgrade_flag=0;
      warp_rank1_training1_flag=0;
      warp_rank2_training1_flag=0;
      warp_rank2_training2_flag=0;

      //challenges are never reset
      //warp_challenge1_flag=0;
      //warp_challenge2_flag=0;

    //PRESTIGE SPECIAL VARIABLES
    warp_max_magnetron_duration=60;//default max magnetron duration; later upgraded to 120
    warp_max_magnetron_multiplier=10;//default max magnetron multiplier; later upgraded to 20
    warp_magnetron_alerting=0;//default value, later upgraded to 1

    buymax_toggle_flag=0;
    rlab_autobuy_toggle_flag=0;
    night_shift=0;
    machines_buymax_toggle_flag=0;
        machines_buymax_toggle.hide();
        buymax_toggle.hide();
        rlab_autobuy_toggle.hide();

    engden_state=0;

    //lscanner stays if a particular quantum upgrade was bought
    if(quantum_upgrade_flag[1]==0){
      lscanner_state=0;
    }else{
      lscanner_state=1;
      warp_price=warp_price*1000;//to compensate for the two trainings and the rank of Floor Admin
    }
    //but we reset lifeforms and other lscanner variables in either case
    ogr=2;//default overdrive price growth rate; it will increase with the increase of antimatter
    recency=0;
    lifeforms_collection=[0,0,0,0,0,0,0,0];


    //resetting all-time antimatter and money variables
    antimatter_cubes=0;
    antimatter_cubes_spent=0;
    all_time_antimatter=0;
    all_time_money=0;
    prestige_multiplier=1;
    prevAntimatterCost=0;
    nAC();//to update the antimatter progress bar

    //resetting positrons for the next cycle
    all_time_positrons=0;
    all_time_positron_cubes=0;
    positron_cubes=0;
    positron_cubes_spent=0;//not currently used, but just in case
    magicnumber_label.text('[0]');

    overdrive_price=1000;
    money_limit_init=50;
    money_limit_upgrade_price_init=10;

    //chief_check block; these variables are set in a way to prepare the game for chief engineer automation (chief_check=1); because it will buy battery and magnetron, we need to reset certain variables that would otherwise be irrelevant in the normal run;
    charge=0;//if this is not reset, chief_check will immediately buy magnetron

    gambling_choice=[];//Quantum Wipe and new Power Plant resets Synchrotron progress
    gambling_boosts=0;

  }

  function ppaInit(){

    item3_pp.hide();
    item3_pp_plus.show();
    item3_pp_plus.css('visibility','hidden');

    one_x=0;//reusing this variable to animate power plant strips


    //building
    for (let i = 0; i < powerplants_amount; i++) {

      if(i==0){
        pp1.show();
      }
      if(i==1){
        pp2.show();
        pp2_add.hide();
      }
      if(i==2){
        pp3.show();
        pp3_add.hide();
      }
      if(i==3){
        pp4.show();
        pp4_add.hide();
      }
      if(i==4){
        pp5.show();
        pp5_add.hide();
      }

    }

    ppaState();

    if(!ppa_interval){ppa_interval=setInterval(ppaLoop,30);}

  }
  function ppaState(){

    var powerplants_price_label;
    var ppa_upgrade_price2;

    //if galactic amplifier wasn't activated, we make the price of this one always +1 more than what the player currently has, so that you have to apply these upgrades sequentially
    if(powerplants_multiplier>=5){ppa_upgrade_price2=ppa_upgrade_price;}
    else{ppa_upgrade_price2=parseInt(ppa_upgrade_price+1);}

    //setting up button labels
    if(ppa_upgrade_price==1){powerplants_price_label=' Power Plant';}
    else{powerplants_price_label=' Power Plants';}

    ppa_upgrade1.text(ppa_upgrade_price+powerplants_price_label);
    ppa_upgrade2.text(ppa_upgrade_price+powerplants_price_label);
    ppa_upgrade3.text(ppa_upgrade_price2+' Power Plants');//price will always be >1
    ppa_upgrade4.text(ppa_upgrade_price+powerplants_price_label);

    //checking button state

    if(powerplants_amount>=ppa_upgrade_price){button10Enable(ppa_upgrade1);}
    else{button10Disable(ppa_upgrade1);}

    if(powerplants_amount>=ppa_upgrade_price){button10Enable(ppa_upgrade2);}
    else{button10Disable(ppa_upgrade2);}

    if(powerplants_amount>=ppa_upgrade_price2){button10Enable(ppa_upgrade3);}
    else{button10Disable(ppa_upgrade3);}

    if(powerplants_amount>=ppa_upgrade_price){button10Enable(ppa_upgrade4);}
    else{button10Disable(ppa_upgrade4);}

    //marking  as sold

    if(time_fundamental<0.5){
      ppa_upgrade1.text("Activated");
      ppa_upgrade1.prop('disabled', true).removeClass('button10').removeClass('disabled10').addClass('activated10');
      ppa_upgrade1_title.css('color','#30b8d0');
    }else{
      ppa_upgrade1_title.css('color','#db3356');
    }

    if(powerplants_multiplier>=5){
      ppa_upgrade2.text("Activated");
      ppa_upgrade2.prop('disabled', true).removeClass('button10').removeClass('disabled10').addClass('activated10');
      ppa_upgrade2_title.css('color','#30b8d0');
    }else{
      ppa_upgrade2_title.css('color','#db3356');
    }

    if(powerplants_multiplier>=50){
      ppa_upgrade3.text("Activated");
      ppa_upgrade3.prop('disabled', true).removeClass('button10').removeClass('disabled10').addClass('activated10');
      ppa_upgrade3_title.css('color','#30b8d0');
    }else{
      ppa_upgrade3_title.css('color','#db3356');
    }

    if(chief==1){
      ppa_upgrade4.text("Activated");
      ppa_upgrade4.prop('disabled', true).removeClass('button10').removeClass('disabled10').addClass('activated10');
      ppa_upgrade4_title.css('color','#30b8d0');
    }else{
      ppa_upgrade4_title.css('color','#db3356');
    }


    //0.99.5 endgame
    if(powerplants_amount==5){

      endgame.show();

      //marking warp_challenge1 as done
      if(warp_challenge1_flag==0){
        warp_challenge1_flag=1;
      }

      //marking buff_challenge1 as done
      if(buff_challenge1_flag==0){
        buff_challenge1_flag=1;
      }

      endgame_quantum_wipe_label.text('');

      if(warp_challenge1_flag==1){
        endgame_quantum_wipe_label.html('<b>Primal Grind</b> has been completed! Go back to the power plant and warp to claim challenge.');
      }

      if(buff_challenge1_flag==1){
        endgame_quantum_wipe_label.html('<b>Maven Grind</b> has been completed! Go back to the power plant and warp to claim challenge.');
      }


    }else{//if(powerplants_amount==5)
      endgame.hide();
    }



  }
  function ppaLoop(){
    one_x+=1;$(pp_quadrant).css('background-position', + one_x + 'px 0px');
  }
  function ppaReset(){
    powerplants_amount=0;
    time_fundamental=1;
    powerplants_multiplier=1;
    ppa_upgrade_price=1;
    chief=0;chief_check=0;chief_warp_check=0;

    //solar amplifier
    if(quantum_upgrade_flag[3]==1){

      if(warp_challenge3_flag==2){
        powerplants_multiplier=3;
        time_fundamental=0.5;
      }else{
        powerplants_multiplier=2;
      }

    }

  }

  //machines init functions
  function batteryInit(){

    battery_state=1;//battery is unlocked

    battery_min_flag=0;//starts maximized
    battery_body.show();

    //function contains what is required to initialize the unit
    charge_limit=50;charge_limit_label.text("["+numT(charge_limit)+"]");
    charge_limit_upgrade_price=10;charge_limit_upgrade.text("⑂" + numT(charge_limit_upgrade_price));

    charge_throughput_upgrade.show();
    charge_throughput_upgrade_price=Math.pow(10,6);charge_throughput_upgrade.text("⑂" + numT(charge_throughput_upgrade_price));
    charge=0;progress_battery();//so that when the battery is activated, there is a sign on its progress bar


      //animal multipler
      if((animal7_battery_charge_multiplier-1)>0){animal7_battery_charge_multiplier_label.text('x'+(Math.floor((animal7_battery_charge_multiplier-1)*100))+'%');}else{animal7_battery_charge_multiplier_label.text('');}

    battery_charge_percentage_limit=1;
    battery_charge_percentage=1;battery_charge_percentage_label.text(battery_charge_percentage+"%");//we start with %1, so that new players are not confused and the machine start to work immediately (although it's still possible that they would need to generate more to see the effect)
    charge_throughput_label.text("["+battery_charge_percentage_limit+"%]");

    //because we probably won't be able to afford it when the battery just activates
    factoryState();

    battery_lock_block.hide();
    battery_block.show();

    magnetron_unlock_upgrade_price=Math.pow(10,6);magnetron_unlock_upgrade.text("⑂" + numT(magnetron_unlock_upgrade_price));
    button1Disable(magnetron_unlock_upgrade);
    magnetron_lock_block.show();
  }
  function magnetronInit(){

    magnetron_state=1;//magnetron is unlocked

    magnetron_min_flag=0;
    magnetron_body.show();

    magnetron_choice=999;//default value

    magnetron_probability_game_label.text(''+magnetron_probability_game_set[getRandomInt(0,5)]+' '+magnetron_probability_game_set[getRandomInt(0,5)]+' '+magnetron_probability_game_set[getRandomInt(0,5)]+' '+magnetron_probability_game_set[getRandomInt(0,5)]+'');

    //function contains what is required to initialize the unit
    device_magnetron_multiplier=2;magnetron_multiplier_label.text("[x"+device_magnetron_multiplier+"]");magnetron_button.text("x"+(device_magnetron_multiplier+animal3_magnetron_multiplier));
    magnetron_multiplier_upgrade_price=Math.pow(10,10);magnetron_multiplier_upgrade.text("⑂" + numT(magnetron_multiplier_upgrade_price));
      //animal multipler
      if(animal3_magnetron_multiplier>0){animal3_magnetron_multiplier_label.text('+'+animal3_magnetron_multiplier);}
      else{animal3_magnetron_multiplier_label.text('');}

    magnetron_duration=30;magnetron_duration_label.text("["+magnetron_duration+" sec]");
    magnetron_duration_upgrade_price=Math.pow(10,9);magnetron_duration_upgrade.text("⑂" + numT(magnetron_duration_upgrade_price));
      //animal multipler
      if(animal2_magnetron_duration>0){animal2_magnetron_duration_label.text('+'+animal2_magnetron_duration);}
      else{animal2_magnetron_duration_label.text('');}

    //this is now set at the top of the page at variable declaration, since buildLifeformsCollection() must happen early in LoadGame(), before this variable would be set in this function, and probability is displayed on the magnetron. Didn't want to call buildLifeformsCollection again. And this is, basically, a const anyway.
    //magnetron_probability_max=2000;

    magnetron_buttonDisable();
    magnetron_duration_upgrade.show();
    magnetron_multiplier_upgrade.show();

    magnetron_lock_block.hide();
    magnetron_block.show();

    foundry_unlock_upgrade_price=Math.pow(10,17);foundry_unlock_upgrade.text("⑂" + numT(foundry_unlock_upgrade_price));
    button1Disable(foundry_unlock_upgrade);
    foundry_lock_block.show();

    if(quantum_upgrade_flag[5]==1){
      gamblingInit();
    }
  }
  function foundryInit(){

    foundry_state=1;//foundry is unlocked

    foundry_min_flag=0;
    foundry_body.show();

    if(quantum_upgrade_flag[0]==1){foundry_components_multiplier_qm=1000000;}
    else{foundry_components_multiplier_qm=1;}

    foundry_heating_stage=0;
    foundry_components_multiplier=1;foundry_components_multiplier_label.text("["+numT(foundry_components_multiplier*foundry_components_multiplier_qm)+"]");
    foundry_production_flag=0;//when initialized, the foundry is in non-production mode and requires heating up first
    foundry_components=0;

    fccu_stage=0;
    fccu_level=1;

    progress3(fccu_stage,pb_components_multiplier,pb_components_multiplier_indicator,"+1");

    //function contains what is required to initialize the unit
    foundry_components_cycle_upgrade_price=Math.pow(10,20);foundry_components_cycle_upgrade.text("⑂" + numT(foundry_components_cycle_upgrade_price));
    foundry_components_label.text("⯎" + numT(foundry_components));

    //animal multipler
    if((animal6_components_multiplier-1)>0){animal6_components_multiplier_label.text('x'+(Math.floor((animal6_components_multiplier-1)*100))+'%');}else{animal6_components_multiplier_label.text('');}

    foundry_temperature=0;furnace_screen.text(foundry_temperature+" °C");
    if(battery_charge_percentage>=10){
      furnace_screen.removeClass('furnace_screen_dim').addClass('furnace_screen_lit');
    }else{furnace_screen.removeClass('furnace_screen_lit').addClass('furnace_screen_dim');}
    foundry_lock_block.hide();
    foundry_block.show();

    //waste
    foundry_waste=0;

      if(secret1_flag==1){
        foundry_waste_limit=750;
      }else{foundry_waste_limit=1000;}

    button1Disable(foundry_recycle_upgrade);
    foundry_recycle_upgrade.text("Recycle ⌬");
    foundry_waste_label.text(foundry_waste+"/"+foundry_waste_limit);

    //Molten Core
    if(quantum_upgrade_flag[0]==1){
      foundry_temperature=3422;furnace_screen.text(foundry_temperature+" °C");
    }

    radiator_unlock_upgrade_price=Math.pow(10,6);radiator_unlock_upgrade.text("⯎" + numT(radiator_unlock_upgrade_price));
    button1Disable(radiator_unlock_upgrade);
    radiator_lock_block.show();
  }
  function radiatorInit(){

    radiator_state=1;//radiator is unlocked

    radiator_min_flag=0;
    radiator_body.show();

    radiator_active=0;
    lamps_port.html('<img src="img/lamp_one_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50">');
    radiator_button_center.text("OFF");

    radiator_one_multiplier=1;
    radiator_two_multiplier=1;
    radiator_three_multiplier=1;
    radiator_four_multiplier=1;

    radiator_playhead=0;

    radiator_boost=2;
    radiator_boost_label.text('[x'+radiator_boost+']');
    //animal multipler
    if((animal8_radiator_boost-1)>0){animal8_radiator_boost_label.text('+'+animal8_radiator_boost);}else{animal8_radiator_boost_label.text('');}

    radiator_lock_block.hide();
    radiator_block.show();

    pc_unlock_upgrade_price=Math.pow(10,12);pc_unlock_upgrade.text("⯎" + numT(pc_unlock_upgrade_price));
    button1Disable(pc_unlock_upgrade);
    pc_lock_block.show();

  }
  function pcInit(){

    pc_state=1;

    pc_min_flag=0;
    pc_body.show();

    nPCC();//to upgrade the nextPositronCubesCost on the UI

    pc_seconds_amount=0;

    if(quantum_upgrade_flag[4]==1){pc_emission_boost=10000;}
    else{pc_emission_boost=1;}

    positrons=0;pc_positrons_label.text('['+numT(all_time_positrons)+'/'+numT(nextPositronCubesCost)+']');
    pc_positron_cubes_label.html('&#8984;'+numT(all_time_positron_cubes-positron_cubes));
    pc_emission=100;pc_emission_label.text('[1-'+numT(pc_emission*pc_emission_boost)+']');

    pc_emission_upgrade_price=Math.pow(10,20);pc_emission_upgrade.text( "⯎" +  numT(pc_emission_upgrade_price) );

    pc_lock_block.hide();
    pc_block.show();

  }
  function gamblingInit(){

    gambling_state=1;

    gambling_min_flag=0;
    gambling_body.show();
    gambling_block.show();

    gambling_collect_flag=1;//default value is 1, meaning "we have already collected, so cannot collect now". magnetronRequest() is the only place that sets it to 0, allowing to collect
    gambling_collect_upgrade.removeClass('selected11').addClass('button11');

    if(gambling_choice.length>0){
      let q1=magnetron_probability_game_set[gambling_choice[0]];
      let q2=magnetron_probability_game_set[gambling_choice[1]];if(!q2){q2='';}
      let q3=magnetron_probability_game_set[gambling_choice[2]];if(!q3){q3='';}

      gambling_symbol_label.html( '<span class="blue" style="visibility:visible">'+q1+q2+q3+'</span>');
    }else{
      gambling_symbol_label.html( '<span class="blue" style="visibility:hidden">⍙</span>');
    }

    gambling_boosts_label.text('['+gambling_boosts+']');
    if(gambling_boosts>0){button2Enable(gambling_boosts_upgrade);}
    else{button2Disable(gambling_boosts_upgrade);}

  }

  function ccSetup(){
    if(chief_check==1){

      chief_check_toggle.removeClass('button3gray').addClass('button3blue').text("ON");

      buymax_toggle_flag=1;
      rlab_autobuy_toggle_flag=1;
      night_shift=1;
      machines_buymax_toggle_flag=1;

      buymax_toggle.hide();
      rlab_autobuy_toggle.hide();
      machines_buymax_toggle.hide();
      night_shift_toggle.attr("class", "engden_on").text("ON");

      restartGenerators();

    }else{

      chief_check_toggle.removeClass('button3blue').addClass('button3gray').text("OFF");

      buymax_toggle.html('[<span class="purple">auto</span>]');
      rlab_autobuy_toggle.html('[<span class="purple">auto</span>]');
      machines_buymax_toggle.html('[1/<span class="purple">max</span>]');
      night_shift_toggle.attr("class", "engden_on").text("ON");

      buymax_toggle.show();
      rlab_autobuy_toggle.show();
      machines_buymax_toggle.show();

    }

    //this setting isn't set here, only reflected. It's set to 1 by default when you load the game and then can be changed by the player through the chief_cc panel
    if(chief_warp_check==0){chief_warp_check_toggle.removeClass('button3blue').addClass('button3gray').text("OFF");}
    else{chief_warp_check_toggle.removeClass('button3gray').addClass('button3blue').text("ON");}
  }
  function ccSwitch(){

    if(chief_check==0){chief_check=1;}else{chief_check=0;}

    ccSetup();

  }
  function ccPrestige(){//automatic prestige

    var ac_owned;

    chief_check=0;//to properly stop all the generators

    //game is saved, since due to the Chief Engineer being very efficient, frequently warps happen before 120 seconds on the save timer run out. Therefore, long stretches of time might pass when progress is not saved at all. Therefore, with every automatic warp a save is forced
    SaveGame();

    prestigeOk();

    ac_owned=antimatter_cubes-antimatter_cubes_spent;

    //first we go through the ranks, then go for magnetron upgrades
    if(ac_owned-warp_price>=0 && engden_state==0){
      warp_rank1_upgrade.trigger("click");
    }
    if(ac_owned-warp_price>=0 && warp_rank2_training1_flag==0){
      warp_rank2_training1_upgrade.trigger("click");
    }
    if(ac_owned-warp_price>=0 && warp_rank2_training2_flag==0){
      warp_rank2_training2_upgrade.trigger("click");
    }
    if(ac_owned-warp_price>=0 && lscanner_state==0){
      warp_rank2_upgrade.trigger("click");
    }

    if(ac_owned-warp_price>=0 && warp_max_magnetron_multiplier<20){
      warp_magnetron_multiplier_upgrade.trigger("click");
    }
    if(ac_owned-warp_price>=0 && warp_max_magnetron_duration<120){
      warp_magnetron_duration_upgrade.trigger("click");
    }
    if(ac_owned-warp_price>=0 && warp_magnetron_alerting==0){
      warp_magnetron_alerting_upgrade.trigger("click");
    }

    //then reboot and trigger chief_check_toggle to start generating
    setTimeout(function () { chief_check=1; rebootOk(); },1500);

  }

  function magnetronRequest(){

    if(Math.floor((Math.random() * (magnetron_probability_max - animal4_magnetron_probability_modifier ) ) + 1)==1){

      magnetron_state=2;//set magnetron state to armed

      magnetron_buttonEnable();

      if(warp_magnetron_alerting==1){
        PlayAudio(6);
      }

      let q = Math.floor( ( Math.random() * 6 ) );

      magnetron_choice=q;
      gambling_collect_flag=0;//can collect
      gambling_collect_upgrade.removeClass('button11').addClass('selected11');

      if(gambling_state==1){//to prevent cheating: magnetron_choice gets locked in
        SaveGame();
        save_sec=120;
        button3Disable(save_upgrade);
      }

      magnetron_probability_game_label.text(''+magnetron_probability_game_set[q]+' '+magnetron_probability_game_set[q]+' '+magnetron_probability_game_set[q]+' '+magnetron_probability_game_set[q]+'');

      if(chief_check==1){magnetron_button.trigger("click");}

    }else{
      magnetron_probability_game_label.text(choose(magnetron_probability_game_set)+' '+choose(magnetron_probability_game_set)+' '+choose(magnetron_probability_game_set)+' '+choose(magnetron_probability_game_set));
    }

  }
  function magnetronShutdown(){
    magnetron_multiplier=1;
    magnetron_state=1;//back to non-armed state
    GeneratorRatios();
    pb_money_indicator.css("background-color","#c149ff");
    magnetron_button.text("x"+(device_magnetron_multiplier+animal3_magnetron_multiplier));
    magnetron_buttonDisable();
      magnetron_choice=999;
      gambling_collect_flag=1;
      gambling_collect_upgrade.removeClass('selected11').addClass('button11');
  }
  function couplingsWear(){

    if(Math.floor( ( Math.random() * auxiliary_probability_max ) + 1)==5){

      var avalue;
      var aeu_combined=aux_eff_unit+animal5_auxiliary_effectiveness_modifier;
      var ae_max=50+50+animal5_auxiliary_effectiveness_modifier*2;

      if(Math.floor((Math.random() * 2) + 1)==1){
        avalue=parseInt(auxiliary_lever1.val())-1;
        if(avalue<-50){avalue=-50;}
        auxiliary_lever1.val(avalue);
        auxiliary_effectiveness1=aeu_combined-Math.abs( Math.floor(avalue/10) * (aeu_combined/5) );
      }else{
        avalue=parseInt(auxiliary_lever2.val())+1;
        if(avalue>50){avalue=50;}
        auxiliary_lever2.val(avalue);
        auxiliary_effectiveness2=aeu_combined-Math.abs( Math.ceil(auxiliary_lever2.val()/10) * (aeu_combined/5) );
      }

      auxiliary_effectiveness=1+(auxiliary_effectiveness1+auxiliary_effectiveness2)*0.01;
      if(animal5_auxiliary_effectiveness_modifier>0){
        auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%/"+ae_max+"%]");
      }else{
        auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%]");
      }

      GeneratorRatios();

    }

  }

  function radiatorSwitch(){
    if(radiator_active==1){

      switch(radiator_playhead){
        case 0:
          lamps_port.html('<img src="img/lamp_one.png" width="50"><img src="img/lamp.png" width="50"><img src="img/lamp.png" width="50"><img src="img/lamp.png" width="50">');
          radiator_one_multiplier=radiator_boost+animal8_radiator_boost;
          radiator_two_multiplier=1;
          radiator_three_multiplier=1;
          radiator_four_multiplier=1;

          one_ratios_flag=1;//to trigger GeneratorRatios()
        break;
        case 1:
          lamps_port.html('<img src="img/lamp.png" width="50"><img src="img/lamp_two.png" width="50"><img src="img/lamp.png" width="50"><img src="img/lamp.png" width="50">');
          radiator_one_multiplier=1;
          radiator_two_multiplier=radiator_boost+animal8_radiator_boost;
          radiator_three_multiplier=1;
          radiator_four_multiplier=1;

          two_ratios_flag=1;
        break;
        case 2:
          lamps_port.html('<img src="img/lamp.png" width="50"><img src="img/lamp.png" width="50"><img src="img/lamp_three.png" width="50"><img src="img/lamp.png" width="50">');
          radiator_one_multiplier=1;
          radiator_two_multiplier=1;
          radiator_three_multiplier=radiator_boost+animal8_radiator_boost;
          radiator_four_multiplier=1;

          three_ratios_flag=1;
        break;
        case 3:
          lamps_port.html('<img src="img/lamp.png" width="50"><img src="img/lamp.png" width="50"><img src="img/lamp.png" width="50"><img src="img/lamp_four.png" width="50">');
          radiator_one_multiplier=1;
          radiator_two_multiplier=1;
          radiator_three_multiplier=1;
          radiator_four_multiplier=radiator_boost+animal8_radiator_boost;

          four_ratios_flag=1;
        break;
      }

    }else{

      radiator_one_multiplier=1;
      radiator_two_multiplier=1;
      radiator_three_multiplier=1;
      radiator_four_multiplier=1;
      //make sure that whatever generators are active, the ratios are recalculated
      one_ratios_flag=1;
      two_ratios_flag=1;
      three_ratios_flag=1;
      four_ratios_flag=1;


      switch(radiator_playhead){
        case 0:
          lamps_port.html('<img src="img/lamp_one_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50">');
        break;
        case 1:
          lamps_port.html('<img src="img/lamp_off.png" width="50"><img src="img/lamp_two_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50">');
        break;
        case 2:
          lamps_port.html('<img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_three_off.png" width="50"><img src="img/lamp_off.png" width="50">');
        break;
        case 3:
          lamps_port.html('<img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_off.png" width="50"><img src="img/lamp_four_off.png" width="50">');
        break;
      }
    }
  }

  //research lab
  function buildResearchList(){//this re-draws the list

    bonusbox.html('&nbsp;');

    for (let i = 0; i < 8; i++) {

      let color_class;
      let description;
      let type=researchList.type[i];

      if(type==1){
        color_class="blue";
        description='+'+researchList.effect[i]+'% Power';
      }
      if(type==2){
        color_class="green";
        description='x2 Supply';
      }
      if(type==3){
        color_class="red";
        description='Lifeform';
      }

      $( "#bonusboxblock_"+(i+1) ).html('<b><span class="'+color_class+'">⌬'+numT(researchList.price[i])+'</span></b><br><br>');
      $( "#bonusboxblock_"+(i+1) ).append('<span class="silver">'+description+'</span>');

    }

  }
  function researchRequest(){//this generates a new item (no UI elements)

    var type;
    var effect;
    var price;
    var research_probability;

    research_playhead++;
    //to skip over supply upgrades which end at 21
    if(research_playhead>499){research_playhead=22;}
    //console.log(research_playhead);

    //handling probabilities of different item types

    research_probability=0.6;

    if(researchRNG.random[research_playhead]<research_probability){//most are power increases
      researchList.type[7]=1;
    }else{//the rest are lifeforms

      if(lscanner_state==1 && recency==0){//when you unlock lscanner and if recency==1, you get a lifeform

        researchList.type[7]=3;

      }else{//otherwise, a power upgrade

        researchList.type[7]=1;
      }

    }


    //supply upgrades are hardcoded into specific positions

    if(research_playhead==8 || research_playhead==10 || research_playhead==13 || research_playhead==16 || research_playhead==18 || research_playhead==21){
      researchList.type[7]=2;
    }

    //setting up item types and their prices

    if(researchList.type[7]==1){

      researchList.effect[7]=researchRNG.power[research_playhead];//1-3% of power increase

      researchList.price[7]=rlab_lastprice*2;

    }else if(researchList.type[7]==2){
      researchList.effect[7]=2;//doubling of the smallest supply
      researchList.price[7]=rlab_lastprice*2;
    }else if(researchList.type[7]==3){
      researchList.effect[7]=researchRNG.lifeform[research_playhead];//type of lifeform
      researchList.price[7]=rlab_lastprice*2;
    }
    else if(researchList.type[7]==4){
      researchList.effect[7]=2;//doubling power generation for 15 sec; currently not used
      researchList.price[7]=rlab_lastprice*2;
    }

  }
  function researchState(){//this checks if we have enough funds to buy

    //I wanted to optimize here by identifying the first item that the player cannot afford and then disabling everything else after it, since the price can only grow. However, the problem is that I can't use cached selectors then and can only construct them using explicit calls $("#bonusbox_block"+i). Or I can use eval() to construct variables from strings. I think that both options might be slower than simply checking money against all prices one by one, as there are only 8 of them

    if(money-researchList.price[0]>=0){bonusEnable(bonusboxblock_1);}
    else{bonusDisable(bonusboxblock_1);}

    if(money-researchList.price[1]>=0){bonusEnable(bonusboxblock_2);}
    else{bonusDisable(bonusboxblock_2);}

    if(money-researchList.price[2]>=0){bonusEnable(bonusboxblock_3);}
    else{bonusDisable(bonusboxblock_3);}

    if(money-researchList.price[3]>=0){bonusEnable(bonusboxblock_4);}
    else{bonusDisable(bonusboxblock_4);}

    if(money-researchList.price[4]>=0){bonusEnable(bonusboxblock_5);}
    else{bonusDisable(bonusboxblock_5);}

    if(money-researchList.price[5]>=0){bonusEnable(bonusboxblock_6);}
    else{bonusDisable(bonusboxblock_6);}

    if(money-researchList.price[6]>=0){bonusEnable(bonusboxblock_7);}
    else{bonusDisable(bonusboxblock_7);}

    if(money-researchList.price[7]>=0){bonusEnable(bonusboxblock_8);}
    else{bonusDisable(bonusboxblock_8);}

  }
  function buildRNG(seed){

    //this function generates rlab items for the warp session. Every Init() call will generate a random seed that will then be saved and used to build the whole thing. This is done to ensure that players have no incentive to game the research lab, since in the past rlab items were generated on the fly and in some cases it made sense to see what comes up and if you don't like it, reload.
    //the object itself, researchRNG{}, is used in researchRequest() to display research lab upgrade items. It contains 500 items. Even getting to generation X is unlikely to reach 500 and research_playhead will normally hover at around 450 at that point. Still, just in case, research_playhead wraps around when it reaches 500 and goes back to the beginning (to step 22, to be exact, to skip over the hardcoded supply upgrades)
    //researchRNG.random is a pre-generated set of random numbers that is used to determine the type of upgrade
    //researchRNG.lifeform contains
    //Potentially, the object could've been much smaller, since in researchRequest() I use the same research_playhead for everything. Potentially, I could've generated the exact number of lifeforms required, for example, and used a separate playhead variable. However, I reasoned that an array of 500 elements is peanuts and it's better to keep the system slightly less efficient, but much more simple.

    mT = new MersenneTwister(seed);
    researchRNG={
      random:[],
      lifeform:[],
      power:[]
    };

    for (let i = 0; i < 500; i++) {
      researchRNG.random[i]=mT.random();
      researchRNG.lifeform[i]=getRandomIntMT(0,7);
      researchRNG.power[i]=getRandomIntMT(1,3);
    }

  }

  //lifeforms scanner
  function buildLifeformsCollection(){

    //this is built so that all the variables do not need to be saved, and depend entirely on the amount of lifeforms you have collected. And each time you collect a new one, this function not only redraws the Lifeforms Scanner, but also recalculates all the animal multipliers

    for (let i = 0; i < 8; i++) {

      if(lifeforms_collection[i]>0){
        $("#animal"+(i+1)).css("visibility", "visible");
        $("#animal_quantity_"+(i+1)).text("Quantity: " + numT(lifeforms_collection[i]));

      }else{
        $("#animal"+(i+1)).css("visibility", "hidden");
      }

      switch(i){
        case 0:
          //the bonus is directly correlated with the amount of lifeforms collected and is added to the bonus_multiplier in moneyCalc(), so we multiply it by 0.01, so that it becomes a percentage
          animal1_bonus_multiplier=lifeforms_collection[i]*0.01;
        break;

        case 1:
          //every 2 of this lifeform increases magnetron duration. It is then being added to normal magnetron_duration
          animal2_magnetron_duration=parseInt(lifeforms_collection[i]/3);
            //display
            if(animal2_magnetron_duration>0){animal2_magnetron_duration_label.text('+'+animal2_magnetron_duration);}
            else{animal2_magnetron_duration_label.text('');}
        break;

        case 2:
          //same for this one
          animal3_magnetron_multiplier=parseInt(lifeforms_collection[i]/5);
            //display
            if(animal3_magnetron_multiplier>0){animal3_magnetron_multiplier_label.text('+'+animal3_magnetron_multiplier);
                  //update the button when the magnetron is not running
                  if(magnetron_multiplier==1 || magnetron_multiplier==2){
                    magnetron_button.text("x"+(device_magnetron_multiplier+animal3_magnetron_multiplier));}
            }
            else{animal3_magnetron_multiplier_label.text('');}
        break;

        case 3:
          //directly correlated with the number of lifeforms collected, is subtracted from magnetron_probability_max
          animal4_magnetron_probability_modifier=lifeforms_collection[i]*20;
          //but limit it to 990, so that the minimum probability of magnetron is 1:10
          if(animal4_magnetron_probability_modifier>1980){animal4_magnetron_probability_modifier=1990;}
          //display
          magnetron_probability_max_label.text("1:"+ (magnetron_probability_max -animal4_magnetron_probability_modifier) );
        break;

        case 4:
          //directly correlated with the number of lifeforms collected, is added to auxiliary_probability_max
          //animal5_auxiliary_probability_modifier=lifeforms_collection[i];
          animal5_auxiliary_effectiveness_modifier=lifeforms_collection[i]*2;

          var avalue;
          var aeu_combined=50+animal5_auxiliary_effectiveness_modifier;
          var ae_max=50+50+animal5_auxiliary_effectiveness_modifier*2;

          if(warp_challenge2_flag==2 && engden_state==1){//couplings stabilizer
            //setting auxiliary effectiveness to max
            auxiliary_effectiveness1=aeu_combined-0;
            auxiliary_effectiveness2=aeu_combined-0;
            auxiliary_effectiveness=1+(auxiliary_effectiveness1+auxiliary_effectiveness2)*0.01;
            auxiliary_lever1.val(0);
            auxiliary_lever2.val(0);
          }

          if(animal5_auxiliary_effectiveness_modifier>0){
            auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%/"+ae_max+"%]");
          }else{
            auxiliary_effectiveness_label.text("[+"+(auxiliary_effectiveness1+auxiliary_effectiveness2).toFixed(0)+"%]");
          }

        break;

        case 5:
          //directly correlated, multiplied by 0.01 to turn into percents
          animal6_components_multiplier= 1 + (lifeforms_collection[i]*0.05);
            //display
            if((animal6_components_multiplier-1)>0){animal6_components_multiplier_label.text('+'+(Math.round((animal6_components_multiplier-1)*100))+'%');}else{animal6_components_multiplier_label.text('');}
        break;

        case 6:
          //every 5 lifeforms, normalized for percentage
          animal7_battery_charge_multiplier= 1 + (parseInt(lifeforms_collection[i]/2))*0.1;
            //display
            if((animal7_battery_charge_multiplier-1)>0){animal7_battery_charge_multiplier_label.text('+'+(Math.round((animal7_battery_charge_multiplier-1)*100))+'%');}else{animal7_battery_charge_multiplier_label.text('');}
        break;

        case 7:
          //every 2 lifeforms collected
          animal8_radiator_boost=parseInt(lifeforms_collection[i]/2);

          if((animal8_radiator_boost-1)>0){animal8_radiator_boost_label.text('+'+animal8_radiator_boost);}else{animal8_radiator_boost_label.text('');}

        break;

      }

    }//loop

  }

  function autoPowerLimit(){

    money-=money_limit_upgrade_price;
    money_limit=Math.floor(money_limit*1.5);

    money_limit_upgrade_price= Math.floor(money_limit_upgrade_price + money_limit_upgrade_price*0.5);

    money_limit_upgrade.text("⌬" + numT(money_limit_upgrade_price));

    money_limit_label.text("["+numT(money_limit)+"]");

    //I removed this call as it seems to look fine without it. In fact, a flash of a filled power tank looks nice
    //InventoryUpdate();
  }
  function autoChargeLimit(){

    //either I need to use another effect or just keep it quiet, otherwise it's a bit too noisy
    //PlayAudio(8);

    charge-=charge_limit_upgrade_price;
    charge_limit=Math.floor(charge_limit*1.5);

    charge_limit_upgrade_price= Math.floor(charge_limit_upgrade_price + charge_limit_upgrade_price*0.5);
    charge_limit_upgrade.text("⑂" + numT(charge_limit_upgrade_price));

    charge_limit_label.text("["+numT(charge_limit)+"]");

    ChargeUpdate();

  }
  function autoPowerUpgrade(){

    /*
    We first try to buy Electric, then Plasmic, then Nuclear, then Gravitational.
    Apart from whether there's enough money, we also check for whether we have reached the next generation, and then we buy that. Once we buy the new generation, there is a special check in the upgrade_generation event, which ensures that the generator doesn't stop. In this function we make sure to asign the generator some supplies. Usually, by the time you get to the new generation, your supply_base would be 128.
    */

    var min_supply;
    if(time_fundamental<1){min_supply=3584;}
    else min_supply=1280;

    if(money-one_upgrade_supply_limit_price>=0 && one_price<min_supply){
      audio_override=1;
      one_upgrade_supply_limit.trigger( "click");
      audio_override=0;
      one_supply=one_price;//and immediately re-supplying
      one_supply_label.text(numT(one_supply));
    }

    else if(money-two_upgrade_supply_limit_price>=0 && two_price<min_supply){
      audio_override=1;
      two_upgrade_supply_limit.trigger( "click");
      audio_override=0;
      if(chief_check==1 && two_supply==0){button_two.trigger( "click");}
      two_supply=two_price;//and immediately re-supplying
      two_supply_label.text(numT(two_supply));
    }

    else if(money-three_upgrade_supply_limit_price>=0 && three_price<min_supply){
      audio_override=1;
      three_upgrade_supply_limit.trigger( "click");
      audio_override=0;
      if(chief_check==1 && three_supply==0){button_three.trigger( "click");}
      three_supply=three_price;//and immediately re-supplying
      three_supply_label.text(numT(three_supply));
    }

    else if(money-four_upgrade_supply_limit_price>=0 && four_price<min_supply){
      audio_override=1;
      four_upgrade_supply_limit.trigger( "click");
      audio_override=0;
      if(chief_check==1 && four_supply==0){button_four.trigger( "click");}
      four_supply=four_price;//and immediately re-supplying
      four_supply_label.text(numT(four_supply));
    }


    if(money-power_price_check[0]>=0){
      if(power_price_check[0] + power_price_check[0]*egr<one_upgrade_generation_price){
        one_upgrade_effectiveness.trigger( "click" );
      }else{
        audio_override=1;
        if(one_generation<generation_limit){one_upgrade_generation.trigger("click");}
        audio_override=0;
        one_supply=supply_base;//this is done to make sure that the new generator does not stop after the upgrade to the new generation
      }
    }

    else if(money-power_price_check[1]>=0){
      if(power_price_check[1] + power_price_check[1]*egr<two_upgrade_generation_price){
        two_upgrade_effectiveness.trigger( "click" );
      }else{
        audio_override=1;
        if(two_generation<generation_limit){two_upgrade_generation.trigger("click");}
        audio_override=0;
        two_supply=supply_base;
      }

    }

    else if(money-power_price_check[2]>=0){
      if(power_price_check[2] + power_price_check[2]*egr<three_upgrade_generation_price){
        three_upgrade_effectiveness.trigger( "click" );
      }else{
        audio_override=1;
        if(three_generation<generation_limit){three_upgrade_generation.trigger("click");}
        audio_override=0;
        three_supply=supply_base;
      }

    }



    else if(money-power_price_check[3]>=0){
      if(power_price_check[3] + power_price_check[3]*egr<four_upgrade_generation_price){
        four_upgrade_effectiveness.trigger( "click" );
      }else{
        audio_override=1;
        if(four_generation<generation_limit){four_upgrade_generation.trigger("click");}
        audio_override=0;
        four_supply=supply_base;
      }

    }

  }

  //research lab auto-buy
  function bbCalc(id){

    money-=researchList.price[id];

    //apply effect
    if(researchList.type[id]==1){//increase bonus_multiplier by given percentage

      bonus_multiplier+=researchList.effect[id]*0.01;

    }
    else if(researchList.type[id]==2){//double the supply base

      supply_base*=2;
      one_price=one_price*2;
      two_price=two_price*2;
      three_price=three_price*2;
      four_price=four_price*2;

    }
    else if(researchList.type[id]==3){//lifeforms

            var lifeform_id=researchList.effect[id];
            last_animal=lifeform_id;//saving last animal

            lifeforms_collection[lifeform_id]+=1;//adding the lifeform to the collection

            //zoo keeper adds more lifeforms to the collection
            if(quantum_upgrade_flag[2]==1){

              if(warp_challenge4_flag==2){
                lifeforms_collection[lifeform_id]+=4;
              }else{
                lifeforms_collection[lifeform_id]+=1;
              }

            }

    }

    rlab_lastprice=researchList.price[7];//saving the last price before doing anything to the array

    //console.log(research_playhead);

    //remove the item
    researchList.price.splice(id, 1);
    researchList.type.splice(id, 1);
    researchList.effect.splice(id, 1);

    researchRequest();

  }
  function bbUI(){
    //all the upgrades are iteration agnostic, meaning it's ok to update only the final result on the UI
    //therefore, in order to optimize in case of auto-buy, all the UI updates are made once after the calculation of upgrades

    //type 1
    rlab_panel.text( "+" +  numT( (bonus_multiplier+animal1_bonus_multiplier-1)*100 ) + "%" );

    //type 2
      one_price_label.text("["+supply_base+"]");
      two_price_label.text("["+supply_base+"]");
      three_price_label.text("["+supply_base+"]");
      four_price_label.text("["+supply_base+"]");
        button_one.text(numT(one_price));
        button_two.text(numT(two_price));
        button_three.text(numT(three_price));
        button_four.text(numT(four_price));

      progress3(one_upgrade_supply_limit_stage,pb_one_upgrade_supply_limit,pb_one_supply_indicator,"+"+supply_base);
      progress3(two_upgrade_supply_limit_stage,pb_two_upgrade_supply_limit,pb_two_supply_indicator,"+"+supply_base);
      progress3(three_upgrade_supply_limit_stage,pb_three_upgrade_supply_limit,pb_three_supply_indicator,"+"+supply_base);
      progress3(four_upgrade_supply_limit_stage,pb_four_upgrade_supply_limit,pb_four_supply_indicator,"+"+supply_base);

    //type 3
    buildLifeformsCollection();//rebuilding the collection

    GeneratorRatios();

    buildResearchList();
    InventoryUpdate();

  }

  function getTankPrice(base_price,next_gen_price,power_stage){
    //this function is used to calculate the price required to buy the whole progress bar (tank), starting with the current position

    var res=0;

    for (let i = 0; i < 25; i++) {

      res+=base_price;

      power_stage+=4;
      if(power_stage>=100){
        //console.log("power stage");
        return res;
      }

      base_price=base_price + base_price*egr;

      //check if the next iteration puts the price over the next generation price
      if(base_price + base_price*egr>next_gen_price){
        //console.log("next gen");
        return res;
      }

    }

    if(res==0){
      res=base_price;
    }

    return res;

  }
  function setTankPrice(gen){

    if(gen==0){
      tank_toggle_flag[0]=1;
      tank_price[0]=getTankPrice(one_upgrade_effectiveness_price,one_upgrade_generation_price,one_upgrade_effectiveness_stage);
      one_upgrade_effectiveness.text("⌬" + numT(tank_price[0]));
      power_price_check[0]=tank_price[0];
    }else if(gen==1){
      tank_toggle_flag[1]=1;
      tank_price[1]=getTankPrice(two_upgrade_effectiveness_price,two_upgrade_generation_price,two_upgrade_effectiveness_stage);
      two_upgrade_effectiveness.text("⌬" + numT(tank_price[1]));
      power_price_check[1]=tank_price[1];
    }else if(gen==2){
      tank_toggle_flag[2]=1;
      tank_price[2]=getTankPrice(three_upgrade_effectiveness_price,three_upgrade_generation_price,three_upgrade_effectiveness_stage);
      three_upgrade_effectiveness.text("⌬" + numT(tank_price[2]));
      power_price_check[2]=tank_price[2];
    }else if(gen==3){
      tank_toggle_flag[3]=1;
      tank_price[3]=getTankPrice(four_upgrade_effectiveness_price,four_upgrade_generation_price,four_upgrade_effectiveness_stage);
      four_upgrade_effectiveness.text("⌬" + numT(tank_price[3]));
      power_price_check[3]=tank_price[3];
    }

  }

  //telescope news functions
  function Telescope(){

    telescope_list=[];

      //NEWS items
      telescope_list.push(choose([

        '<b>News:</b> '+choose(['Non-organic isopods','Plasma leaks','Poorly written romance novels','Strange noises from the Plasma generator','Low-frequency noises from below the Plasma generator','Suspicious odors from the Plasma generator','Occasional leaks from the Plasma generator','Plasmic frogs','Unseen spiders','Water drops accumulated on the Plasma generator'])+' were shown to be a direct consequence of '+choose(['irresponsible engineering experiments','random neutrino collisions','quantum mechanics as we understand it','the second law of thermodynamics','media coverage of the issue','vibrations from techno blasted by engineers','UFOs detected in the Engineering Den','strong opinions held by engineers about which type of bolt is better']),

        '<b>News:</b> EU Parliament has just announced that '+choose(['engineers are going to be honored every Wednesday','engineers are going to be receiving geeky t-shirts for Christmas','engineers are going to be granted free bus tickets','a law to outlaw laws is being discussed. Philosophers argue whether that would outlaw the law that outlaws laws as well','engineers are going to receive tax relief in the form of screwdrivers and cables','any engineer can run for office regardless of their hygiene habits','engineers are going to receive tax relief in the form of free annual cleaning of their caves','engineers cannot be classified as weirdos since "there\'s nothing weird about them"']),

        '<b>News:</b> EU Parliament began '+choose(['a session on','working on','deliberations on'])+' replacing some of the outdated regulation regarding the rights of non-organics',

        '<b>News:</b> EU Parliament considers setting up '+choose(['a workgroup','an institute','a committee','a research laboratory'])+' dedicated to studying non-organic isopods as a potential food source',

        '<b>News:</b> EU Parliament was grilled by the press regarding '+choose(['the rights of non-organics','the rights of non-organics to use public charging stations','the invasion of relatively large worms','non-organic isopods as a potential food source for pets','mech ciliates being used as currency throughout the world']),

        '<b>News:</b> A national seismological survey reveals that some seismologists have registered low-frequency vibrations coming from the Plasma Generator',

        '<b>News:</b> The use of mech ciliates as currency begins to outpace crypto',

        '<b>News:</b> The price of a mech ciliate has surpassed the price of Bitcoin',

        '<b>News:</b> Mech ciliate trader '+choose(['jailed for fraud','makes a fortune','looses a flask with a billion worth of ciliates','accidentally gets infected with mech ciliates. Transforms into an android','sells socks to buy more ciliates','buys pizza with ciliates','sells ciliates as NFTs']),

        '<b>News:</b> A study '+choose(['finds that','reveals that','suggests that'])+' '+choose(['most people consider engineers to be true artists','frequent warping is beneficial to one\'s sex life','people who warp frequently experience warping more frequently','non-organic organisms have now been spotted in all major cities across the world','the clicking of generators spurs one\'s creative juices','the clicking of generators induces structured thinking','if left unattended, machinery goes out of order','engineers might require specially designed sustenance','malnourished engineers perform better if offered free drinks','engineers perform better if allowed to rant','engineers tend to come up with weirder contraptions if exposed to 90s sitcoms']),

        '<b>News:</b> A study finds '+choose(['no health risks of frequent warping','no health risks of infrequent warping','no health risks of occasional warping']),

        '<b>Local News:</b> A referendum voices support for more research into '+choose(['large worms','duotronic butterflies','non-organic isopods','unkempt engineers','engineer caves'])+' that have been spotted throughout the city',

        '<b>Local News:</b> '+ choose(['a bakery','a confectionery','some corner cafes','town shops','bars']) + ' ' +choose(['started selling non-organic donuts','began accepting mech ciliates as currency','opened its doors to non-organics'])

      ])
    );

      //Internal announcements
      telescope_list.push(choose([

        '<b>Announcement:</b> section '+getRandomInt(2,999)+' '+choose(['is closed for maintenance','has been reopened after maintenance','has been given a different number. Announcements to follow','is now partially consumed by an expanding portal to another dimension. Containment fields are currently being erected','will be used for a local hacker convention','will be rented out to local filmmakers','is now open, but beware']),

        '<b>Announcement:</b> '+choose(['a pipe burst','an unclear event occured','a wild engineer was sighted','a puff of smoke was observed','a small explosion happened','a volcano erupted','debate between engineers occurred'])+' in section '+getRandomInt(2,999)+', '+choose(['please put on your radiation suit when passing through','please keep out until the investigation is concluded','please keep calm or go panic in another section'])+'. Thank you',

        '<b>Announcement:</b> '+choose(['a crowding of cable lizards has created significant clutter in the Engineering Den. Please clear it out. Thank you.','a can of worms was left open near the Nuclear generator. "It\'s a whole can of worms", says an unnamed chief engineer']),

        '<b>Announcement:</b> a floor administrator witnessed ' + choose(['the mating','skin shedding','the mating ritual','the birth','the hatching']) + ' of '+choose(['unseen spiders','mutated worms','cable lizards','non-organic isopods'])+'. Counseling sessions have been set up',

        '<b>Announcement:</b> an intern '+choose(['considers applying for a permanent position','decides to adopt a non-organic creature','agrees to doing night shifts'])+'. Changes mind after visiting the Engineering Den.',

        '<b>Announcement:</b> an unnamed chief engineer '+choose(['claims to have drank more coffee than anyone else in the history of mankind','suggests that UFOs seen hovering over generators are mutated plastic flies','says it\'s all the government\'s fault','insists he knows more than everyone else in the world','asserts that he had personally designed and assembled all non-organic lifeforms','asserts that he had personally designed and assembled all the generators','says that he has invented the wheel, went back in time and introduced it to humanity','declares himself to be the ultimate expert on everything','claims her pants have more pockets than any other pants in the world'])+'. The statement was later retracted.',

        '<b>Announcement:</b> a floor administrator is '+choose(['allegedely swallowed and then spit out by the Pek Monster','temporarily kidnapped by an organized group of nanobots','attacked by a couple of plasmic frogs','infused with non-organic DNA and grows a metal arm','seen hunting down a duplicitous cable lizard','transformed into an android and then back to a human by an organized group of nanobots','broken down into molecules and then pieced back together by an organized group of nanobots. Philosophers argue if this is now a different person','engulfed and then spit out by an expanding portal to another dimension','seen commanding a tribe of nanobots','infused with non-organic DNA and grows a duotronic leg','considered for promotion, but then gets captured by a UFO','allegedely eaten by unseen spiders, but no one has seen it']),

        '<b>Announcement:</b> floor administrators have set up guard posts ' + choose(['to catch UFOs that hover over generators','to ward off '+choose(['cable lizards','nut beetles','non-organic isopods','plastic flies','plasmic frogs','mutated worms']),'to protect '+ choose(['themselves','the Engineering Den','the Foundry','the canteen','the Battery','the Magnetron','the Radiator']) + ' from ' + choose(['nut beetle hoards','mutated worms invasions','cable lizard packs','the Pek Monster','plastic fly clouds','non-organic isopod gatherings','violent nanobot tribes','other floor administrators']) ]),

        '<b>Announcement:</b> to offset working conditions, some floor administrators have been offered additional ' + choose(['benefits','leave','pay','food','beer','coffee','coffee and marshmellows','counseling sessions','incremental game sessions','milk','chocolate cookies','grilled nanobots','trips to the local zoo to see some organics']),

        '<b>Announcement:</b> '+choose(['breakfast with doughnuts','lunch','tea','happy hour','acid pool party','astronomy lecture'])+' is happening',

        '<b>Announcement:</b> tracks of '+choose(['unseen spiders','mutated worms','cable lizards'])+' were spotted on the wall of '+choose(['the Electric generator','the Plasma generator','the Nuclear generator','the Gravity generator','the Radiator']),

        choose(['A bunch of','A gathering of','A group of'])+' '+choose(['isopods','unidentified organisms','civilians','visitors','workers from the last shift','lawyers','unkempt engineers with empty coffee mugs'])+' '+choose(['was spotted','was reported','was seen','was sighted'])+' hiding under '+choose(['the Electric generator','the Plasma generator','the Nuclear generator','the Gravity generator','the Battery','the Magnetron','the Radiator'])+'. Security has been informed about the incident.',

        choose(['Traces of non-organic isopods','Severed legs of a non-organic organism','Non-organic eggs of unknown insect species'])+' were discovered on one of the pipes of '+choose(['the Electric generator','the Plasma generator','the Nuclear generator','the Gravity generator'])+'. Scientists '+choose(['are preparing to publish a paper on the subject','are recommending a non-organic insecticide solution','ponder if there is any risk to the engineers in the area','are building a 3D model of the non-organic creature']),

        choose(['A bunch of','A gathering of','A group of'])+' '+choose(['isopods','unidentified organisms','civilians','visitors','workers from the last shift','lawyers','unkempt engineers with empty coffee mugs'])+' '+choose(['was spotted','was reported','was seen','was sighted'])+' hiding under '+choose(['the Electric generator','the Plasma generator','the Nuclear generator','the Gravity generator'])+'. No action is required',

        'Several '+choose(['interns','visitors','managers'])+' got lost in the Engineering Den last week. Search considered hopeless at this point',

        'Please report any unidentified persons with unkempt appearances unless you suspect they are engineers',

        '<b>Announcement:</b> some folks walked into an expanding portal to another dimension. '+choose(['Found themselves in a world where everyone is '+choose(['a bubble','a pear-shaped elephant','a voucher of some sort','an essay written by a beginning writer','a badly designed law','a treacherous sofa']), 'Found themselves in the middle of last Tuesday','Came back as honest politicians'])

      ])
    );

      //Internal Bulletin of Random Things
      telescope_list.push(choose([

        '<b>Internal Bulletin:</b> A UFO was spotted hovering over one of the generators. ' + choose(['It was shot down by floor administrators','It was eaten by an unknown organism','It was later identified to be a plastic fly','It was later identified and became an IFO','It was promptly snatched by an unidentified organism','It\'s still there now','It looked like a flying saucer, but on closer inspection bore more resemblance to a chicken','It was captured by floor administrators, but was then let go for unclear reasons','It was shot down by floor administrators and sold to an unnamed chief engineer']),

        '<b>Internal Bulletin:</b> An unidentified crawling object (UCO) was spotted '+choose(['in the Engineering Den','in the Foundry','on the Radiator','under the Battery','on the Particle Collector']),

        '<b>Internal Bulletin:</b> An unidentified crawling object (UCO) was spotted devouring what appeared to have been '+choose(['a chair','a basketball','a piece of metal','another UCO','an unidentified devoured object (UDO)']),

        '<b>Internal Bulletin:</b> Several items disappeared from the Research Lab. ' +choose(['Interns blame each other','Nut beetles are suspected','The perpetrator is unknown','Security was informed','No donuts were taken','One of them was later found half devoured','Unseen spiders were not seen near the facility','An unnamed chief engineer claims he was sold one of the items by a floor administrator']),

        '<b>Internal Bulletin:</b> ' + choose(['Screwdriver throwing contest will be held in the Engineering Den at 1800','A non-organic isopod race will be held in the canteen right after lunch','A non-organics flea market will be held Saturday afternoon, as usual. Iridium fleas are still banned.','An unofficial non-organics collectors\' convention is going to be held next month','A debate on the topic "Are plasmic frogs actually an organic lifeform?" has been canceled','A debate on the topic "Are plasmic frogs actually an organic lifeform?" is scheduled for tomorrow','A friendly discussion on the aesthetic qualities of duotronic butterflies will be held tomorrow']),

        '<b>Internal Bulletin:</b> ' + choose(['a nut beetle','a duotronic butterfly','a flask of mech ciliates','a non-organic isopod']) + ' ' + choose(['infused with gold','painted in rainbow colors','decorated with edible elements','submerged in amber']) + ' was ' + choose(['sold for an undisclosed sum of money','traded for a cup of coffee','sold at a black market','sold for a record sum of money','confiscated by authorities']),

        '<b>Internal Bulletin:</b> ' + choose(['a lack of spare cables is explained by an increase in cable lizard population'])

      ])
    );


/*
      //finances
      telescope_list.push(choose([

        '<b>News:</b> Mech ciliate: $'+getRandomInt(50,90)+' ('+choose(['↑','↓'])+'0,'+getRandomInt(1,15)+'%)'

      ])
    );
*/

      //wild rumours and stupidity
      telescope_list.push(choose([

        choose(['A scientist','Someone online','A conspiracy theorist','A person on the Internet','A fellow engineer','Talk show host','An amateur philosopher','A prominent writer','A local comedian','A homeless guy','Your neighbor','A resident mechanic']) + ' ' + choose(['claims that','concludes that','maintains that','insists that','believes that','wonders if','suggests that','alleges that','considers if']) + ' ' + choose(['non-organic isopods are an evolved lifeform','non-organic isopods are secretly organic','non-organic isopods have evolved from some archaic computer technology','plastic flies cannot be killed with a plastic flyswatter','plastic flies are good for the economy','plastic flies can be used for a variety of purposes in the home','nut beetles are programmed to search for a mating bolt','Pek Monster is an amalgamation of all the known non-organic lifeforms','plasmic frogs could be an addition to a healthy post-apocalyptic diet','mutated worms are partially non-organic','non-organic life is more normal than organic becase "they don\'t poop"','the low-frequency hum of the Plasma generator is a conspiracy','the low-frequency hum of the Plasma generator is a sign of emerging intelligence','unseen spiders actually exist','unseen spiders meet the definition of a veridical paradox','unseen spiders is a hoax perpetrated by overworked operators','they have seen an unseen spider','non-organic life should be considered property theft: "They incorporate our stuff into their bodies and then run away"','duotronic butterflies are actually monotronic','cable lizards could be assembled into one really long cable','antimatter is actually liquified muffins','chief engineers should be kept away from machinery because "they know too much"','an army of floor administrators would easily defeat an ancient Roman army','floor administrators have developed special weaponry to deal with unruly non-organics'])

      ])
    );

      //general advice and warnings
      telescope_list.push(choose([

        '<b>Warning:</b> '+choose(['Be mindful','Be careful','Be extra careful','Be especially attentive'])+' when attempting to '+choose(['debug the low-frequency hum of the Plasma generator','catch a non-organic isopod','manually align couplings']) + ' so as not to ' + choose(['fall into an open hatch','get stuck','be eaten by an unknown organism','be kidnapped by a nanobot tribe']),

        '<b>Hint:</b> solo a generator that you want to track',

        '<b>Hint:</b> allow the clicking of the generators to guide your daily meditation',

        '<b>Keyboard shortcuts:</b> use <b>r</b> to start/restart generators',

        '<b>Keyboard shortcuts:</b> use <b>u</b> to toggle auto-buy',

        '<b>Hint:</b> be sure to consult the Handbook. You can find the link on the footer',

        '<b>Hint:</b> auto-buy is excellent for upgrading in the beginning, but you might want to upgrade specific generators manually from time to time',

        '<b>Hint:</b> Machinery is less likely to slow down when out of focus on some browsers if you leave the sound on. You can make it really quiet',

        '<b>Hint:</b> when the Antimatter Amplifier becomes x100 or larger, the initial Power limit is set to a higher value, dependent on all-time energy mined.'

        ])
      );

      //did you know that
      telescope_list.push(choose([

        '<b>Did you know that</b> ' + choose(['the Research Lab has been recently working on a non-organic caterpillar, the first artificial lifeform','all existing non-organic lifeforms might have evolved from existing machinery','Factory kitchen is situated right next to the Nuclear generator and relies on it for heating and power','the Engineering Den is not a single floor: anything below it is known as the "jungle", but is only accessible to floor administrators','"foundry" is the only word that contains the letters "f", "o", "u, "n", "d", "r" and "y" in exactly that order','chronic sleep deprivation is bad for your health','antimatter storage has a shape of a large egg','the Plasma generator\'s color is yellow','Foundry\'s waste management system is its own chemical plant in a separate building','chief engineers have designated living quarters on the Space Station','the Radiator is built entirely out of recycled android brains','there are several hundred operators working in the Power Plant daily','Magnetron\'s maximum probability of becoming armed is 1 in 10','the maximum attainable temperature of the furnace is 3422 °C','the low frequency hum of the Plasma generator has inspired <a class="lv_discord" href="https://louigi.bandcamp.com/album/gas-giant" target="_blank">several ambient drone albums</a>','you can sometimes hear the low frequency hum of the Plasma generator as the occasional "brrrrrrr"','the Research Lab is very secretive about its work and is infamous for its security measures']) + '?',

        '<b>Fun fact:</b> ' + choose(['non-organic isopods eat mazut, which is why they have to be kept out of fuel storage compartments','cable lizards are considered to be pests because they live in groups and frequently get entangled, blocking passages in the Engineering Den','duotronic butterflies use tiny magnets to stick to ceilings','plasmic frogs are actually dangerous to humans and can inflict damage by shooting streams of plasma','mutated worms don\'t age and usually die because they become too large','mech ciliates can now be found in every device of the Power Plant','plastic flies use pipes and cables to travel between rooms','nut beetles use their appearance to hide between regular nuts, and a number of beetles have actually been incorporated into machinery by mistake','nut beetles that get mistaken for regular nuts are able to unscrew themselves and run away in 30% of cases','duotronic butterflies can change the color of their wings based on their surroundings','researchers are still not sure whether plastic flies require sustenance','plastic flies live 30-50 minutes on average','iridium fleas are illegal to trade and keep as pets','mech ciliates are smaller than antimatter cubes','mech ciliates are capable of feeding on antimatter and a cililate colony could devour an antimatter cube in a matter of hours','there are over 70 registered non-organic lifeforms, but only 16 species have established populations','each mech ciliate has a unique signature, which is why they are being used as currency','mech ciliates are usually kept in flasks','organized nanobot tribes generate memes and share them on the Internet','each mech ciliate has a unique signature, which is facilitating their rise as currency','Pek Monster is the only non-organic lifeform the existence of which hasn\'t been documented','unseen spiders are an actually existing non-organic lifeform','unseen spiders cannot be seen by a human eye, but their tracks can be registered by a clamp meter','cable lizards are used as transportation by other non-organics']),

        ])
      );

      //general quotes
      telescope_list.push(choose([

        '"'+choose(['Be the best you can','Never give up','Stand for what\'s right','Eat your soup','Shaving is not a requirement','Don\'t complain','Higher ups don\'t know shit','If you put your mind to it, you can break anything','It\'s all in your head','Focus on the process, bring me results'])+'" - chief engineer',

        '"'+choose(['UFOs? Never seen one','I haven\'t seen anything','I don\'t know what you\'re talking about','I heard nothing','Nothing ever happens during my shift','I just work here','Pek Monster? I don\'t know what you\'re talking about'])+'" - floor administrator',

        '"'+choose(['That\'s what my chief told me to do','This mess? Approved by my chief','Do I know what I am doing? You bet. Just don\'t bet much!','We are all professionals here, especially the operators','My bad manners? Approved by my chief'])+'" - engineer',

        '"'+choose(['I just focus on the clicking','I just wait for the buttons to activate'])+'" - operator',

        '"'+choose(['I know, right?','Do we warp now, man?','Much antimatter?','What does this button do?','Should we flip this switch?','Wow, what do we do now?','Wild, eh?','Lunch?'])+'" - intern',

        ])
      );

      //magnetron
      if(magnetron_state>0) telescope_list.push(choose([

        'Engineer\'s log: ' + choose(['A number of','A group of','A bunch of','A handful of']) +' ' + choose(['mutated worms','non-organic isopods','slightly mutated worms','mutated worms and non-organic isopods']) + ' are ' + choose(['crawling about on the magnetron','spotted under the magnetron','mating on a panel of the magnetron','forming weird shapes on the magnetron','trying to chew on the magnetron','gnawing on the big magnetron button','glowing when near the magnetron','exhibiting strange behavior when near the magnetron']),

        '"'+choose(['Magnetron is your friend','Treat your magnetron well'])+'" - chief engineer',

        '<b>News:</b> Magnetrons have been voted '+ choose(['"tech\'s hope for the future"','"the world\'s coolest devices"','the leading tech that starts with the letter "m", second only to magnets']),

        '<b>News:</b> EU Parliament '+ choose(['is considering','is planning a vote on','is deliberating on'])+' whether '+choose(['magnetrons are gambling devices','magnetrons can be used in casinos as slot machines','magnetron is a type of a slot machine']),

        '<b>News:</b> Scientists '+ choose(['are looking into','suggest','consider']) + ' using magnetrons to ' + choose(['prolong human lifespan','cure cancer and all other illnesses','eliminate COVID','eliminate poverty','fix the last season of Game of Thrones','fix climate change','build a perpetual motion machine','fix the Internet'])

        ])
      );

      //synchrotron
      if(gambling_state==1) telescope_list.push(choose([magnetron_probability_game_set[0]+' '+magnetron_probability_game_set[0]+' '+magnetron_probability_game_set[0],magnetron_probability_game_set[1]+' '+magnetron_probability_game_set[1]+' '+magnetron_probability_game_set[1],magnetron_probability_game_set[2]+' '+magnetron_probability_game_set[2]+' '+magnetron_probability_game_set[2],magnetron_probability_game_set[3]+' '+magnetron_probability_game_set[3]+' '+magnetron_probability_game_set[3],magnetron_probability_game_set[4]+' '+magnetron_probability_game_set[4]+' '+magnetron_probability_game_set[4],magnetron_probability_game_set[5]+' '+magnetron_probability_game_set[5]+' '+magnetron_probability_game_set[5],magnetron_probability_game_set[2]+' '+magnetron_probability_game_set[4]+' '+magnetron_probability_game_set[5]])
      );

      //foundry
      if(foundry_state==1) telescope_list.push(choose([

        'Engineer\'s log: ' + choose(['A cloud of','A horde of','A swarm of']) + ' plastic flies ' + choose(['has just flown straight into the furnace','was seen circling the foundry','attempted to invade the foundry','was caught in the foundry','was recycled into components','was just eaten by an unknown organism','was registered by a sentient photosensor as "Plastic Fly Group #' + getRandomInt(100,10000) + '"']),

        '"'+choose(['Keep that furnace burning','The foundry is the heart'])+'" - chief engineer',

        '<b>News:</b> Scientists '+ choose(['are looking into','suggest','consider']) + ' using foundry furnace to ' + choose(['produce swords for fantasy conventions','provide lighting source for scribes','make Christmas cookies']),

        '<b>News:</b> ' + choose(['"We should introduce the non-organic isopod into the foundry ecosystem"','"Components should be made out of organic matter, like chocolate"','"Unseen spiders are key to misunderstanding the nature of the Universe"']) + ', says researcher',

        '<b>News:</b> "Plastic flies are a solution to ' + choose(['poverty','pollution','inequality','the shortage of artificial burgers']) + '", says researcher'

        ])
      );

      //radiator
      if(radiator_state==1) telescope_list.push(choose([

        'Engineer\'s log: ' + choose(['A gathering of','A badly organized crowd of','A connected chain of']) + ' cable lizards ' + choose(['has just barricaded the radiator. Again','attempted to devour the radiator. Again','have connected to the radiator and syphoned off some energy. Again','was ejected from the radiator by the newly installed anti-lizard system','was seen casing the radiator. Again','is suspected ot trying to steal the radiator. Again']),

        '"'+choose(['Warmth of the radiator is like the warmth of a parent\'s heart','Respect your radiator and it will radiate respect back at you',])+'" - chief engineer',

        '<b>News:</b> Scientists '+ choose(['are looking into','suggest','consider']) + ' using radiators as ' + choose(['comfort pets','bar stools','false vaping stations','the inlikely science communicators'])

        ])
      );

      //particle collector
      if(pc_state==1) telescope_list.push(choose([

        'Engineer\'s log: ' + choose(['A small group of a trillion','A googol of','A significant amount of']) + ' nanobots ' + choose(['has populated the lower chambers of the particle collector','']),

        '"'+choose(['I\'m not yet allowed to be around the particle collector','They say the particle collector is like a huge skyscraper','I heard all sorts of mysterious non-organics live in the particle collector'])+'" - operator',

        '<b>News:</b> Scientists '+ choose(['are looking into','suggest','consider']) + ' using particle collectors as ' + choose(['tools to trap small objects, such as particles','collectors of particles'])

        ])
      );



    /*
        //
        telescope_list.push(choose([


          ])
        );
    */


    shuffleArray(telescope_list);
    //console.log(telescope_list);

  }
  function startTelescope(){

    var counter=0;

    Telescope();//build news items array
    telescope.html(telescope_list[0]);//immediately show something

    if(!telescope_timer){
      telescope_timer=setInterval(function() {

        counter++;

        if(counter>telescope_list.length-1){
          counter=0;
          Telescope();//re-build news items

        }

        telescope.html(telescope_list[counter]);

      }, 25000);
    }

  }

  function SaveGame(){
    let gameData = {
      player:[money,money_limit,actions,total_money,all_time_money,actions_limit,version,chief],
      debug:[debug_mode,qkeycard],
      achievements:[actions_cycle,bonus_multiplier,researchList,research_playhead,overdrive_price,ogr,researchSeed],
      ui: [audio_mute,audio_mute_one,audio_mute_two,audio_mute_three,audio_mute_four,audio_mute_allgen,audio_volume,chief_warp_check,night_shift,buymax_toggle_flag,rlab_autobuy_toggle_flag,machines_buymax_toggle_flag,scientific_ui,battery_min_flag,magnetron_min_flag,foundry_min_flag,radiator_min_flag,pc_min_flag,gambling_min_flag,tank_toggle_flag],
      upgrade_pbs: [one_upgrade_supply_limit_stage,two_upgrade_supply_limit_stage,three_upgrade_supply_limit_stage,four_upgrade_supply_limit_stage,one_upgrade_effectiveness_stage,two_upgrade_effectiveness_stage,three_upgrade_effectiveness_stage,four_upgrade_effectiveness_stage,one_upgrade_effectiveness_level,two_upgrade_effectiveness_level,three_upgrade_effectiveness_level,four_upgrade_effectiveness_level,supply_base],
      prices: [one_upgrade_supply_limit_price,two_upgrade_supply_limit_price,three_upgrade_supply_limit_price,four_upgrade_supply_limit_price,one_upgrade_effectiveness_price,two_upgrade_effectiveness_price,three_upgrade_effectiveness_price,four_upgrade_effectiveness_price,one_upgrade_generation_price,two_upgrade_generation_price,three_upgrade_generation_price,four_upgrade_generation_price,money_limit_upgrade_price],
      generators: [one_generation,two_generation,three_generation,four_generation,one_price,two_price,three_price,four_price,one_init_multiplier,two_init_multiplier,three_init_multiplier,four_init_multiplier,one_multiplier,two_multiplier,three_multiplier,four_multiplier],
      machine_states:[battery_state,magnetron_state,foundry_state,lscanner_state,radiator_state,pc_state],
      battery:[charge,charge_limit,battery_charge_percentage,charge_limit_upgrade_price,battery_charge_percentage_limit,charge_throughput_upgrade_price],
      magnetron:[device_magnetron_multiplier,magnetron_duration,magnetron_multiplier_upgrade_price,magnetron_duration_upgrade_price,magnetron_choice],
      engden:[engden_state],
      lscanner:[lifeforms_collection,recency],
      foundry:[foundry_components,foundry_components_multiplier,foundry_components_cycle_upgrade_price,fccu_stage,fccu_level,foundry_temperature,foundry_production_flag,foundry_waste],
      radiator:[radiator_active,radiator_playhead],
      pc:[positrons,pc_emission,pc_emission_upgrade_price],
      gambling:[gambling_choice,gambling_boosts,gambling_collect_flag],
      secrets:[secret1_flag,secret2_flag],
      prestige: [prestige_multiplier,antimatter,all_time_antimatter,antimatter_cubes,antimatter_cubes_spent,warp_panel4_upgrade_flag,warp_max_magnetron_duration,warp_max_magnetron_multiplier,warp_magnetron_alerting,warp_panel1_upgrade_flag,warp_panel2_upgrade_flag,warp_panel3_upgrade_flag,warp_price,warp_rank1_training1_flag,warp_rank2_training1_flag,warp_rank2_training2_flag],
      prestige2:[all_time_positrons,positron_cubes,positron_cubes_spent,powerplants_amount,time_fundamental,powerplants_multiplier,ppa_upgrade_price],
      challenges:[warp_challenge1_flag,warp_challenge2_flag,warp_challenge3_flag,warp_challenge4_flag,buff_challenge1_flag,buff_challenge2_flag],
      quantum_upgrades:[quantum_upgrade_flag]
    };


    gameData=LZString.compressToBase64(JSON.stringify(gameData));
    gamesavedump.text(gameData);
    localStorage.setItem(savefile_name, gameData);
  }
  function LoadGame(){
    let gameData=localStorage.getItem(savefile_name);
    gamesavedump.text(gameData);

    if(gameData) {
      try {
          gameData = LZString.decompressFromBase64(gameData);
          if(gameData===null){gameData="invalid save";}
          gameData = JSON.parse(gameData);
      } catch(e) {
          console.log(e);
          incorrectsave_infobox.show().html("The save is invalid.<br><br>Make sure you copied the save correctly. If you don't have a save you can use, you can reset the game, by wiping the save and starting from scratch (see Settings below)");
          all.hide();
          return;
      }
    }

    if(version!=gameData.player[6]){
      incorrectsave_infobox.show().html("A save from a previous version detected. It's not compatible with <span class='red'>Machinery ["+version+"]</span><br><br>Please, wipe save to start from scratch or import a save that matches this game version (see Settings below)");
      clearInterval(save_timer);button3Disable(save_upgrade);save_timer=null;
      all.hide();
      return;
    }

    debug_mode=parseInt(gameData.debug[0]);
    if(debug_mode==5){
      debug_mode_panel.show();
      qkeycard=parseInt(gameData.debug[1]);
      if(qkeycard==0){debug_qkeycard_upgrade.removeClass('button3blue').addClass('button3gray');}
      else{debug_qkeycard_upgrade.removeClass('button3gray').addClass('button3blue');}
    }

    //scientific notation first
    scientific_ui=parseInt(gameData.ui[12]);
    if(!scientific_ui){scientific_ui=0;}
    if(scientific_ui==0){toggle_scientific.attr("class", "button3");}
    else{toggle_scientific.attr("class", "button3blue");}

    //PLAYER
    money=Number(gameData.player[0]);
    money_limit=Number(gameData.player[1]);money_limit_label.text("["+numT(money_limit)+"]");
    money_limit_upgrade_price=Number(gameData.prices[12]);money_limit_upgrade.text("⌬" + numT(money_limit_upgrade_price));
    actions=parseInt(gameData.player[2]);
    total_money=Number(gameData.player[3]);
    all_time_money=Number(gameData.player[4]);
    actions_limit=Number(gameData.player[5]);
    //version=gameData.player[6];//version check is at the top; we also don't need to override the version variable from the save
    chief=parseInt(gameData.player[7]);

    all_time_positrons=Number(gameData.prestige2[0]);//prestige2 stuff, required in pcInit()
    positron_cubes=Number(gameData.prestige2[1]);
    positron_cubes_spent=Number(gameData.prestige2[2]);
    powerplants_amount=Number(gameData.prestige2[3]);
    time_fundamental=parseFloat(gameData.prestige2[4]);
    powerplants_multiplier=parseInt(gameData.prestige2[5]);
    ppa_upgrade_price=parseInt(gameData.prestige2[6]);

    //challenges and their related upgrades are called early, since they might influence stuff below
    warp_challenge1_flag=parseInt(gameData.challenges[0]);
    warp_challenge2_flag=parseInt(gameData.challenges[1]);
    warp_challenge3_flag=parseInt(gameData.challenges[2]);
    warp_challenge4_flag=parseInt(gameData.challenges[3]);
    buff_challenge1_flag=parseInt(gameData.challenges[4]);
    buff_challenge2_flag=parseInt(gameData.challenges[5]);

    quantum_upgrade_flag=gameData.quantum_upgrades[0];

    secret1_flag=parseInt(gameData.secrets[0]);
    secret2_flag=parseInt(gameData.secrets[1]);


    //set default engden values here, because buildLifeformsCollection() might change them
    auxiliary_effectiveness=1;
    auxiliary_effectiveness1=0;
    auxiliary_effectiveness2=0;

    //this is called early, since many different variables will depend on lifeform multipliers
    lifeforms_collection=gameData.lscanner[0];
    recency=gameData.lscanner[1];

      buildLifeformsCollection();

    //research lab goes here, since it requires recency
    actions_cycle=parseInt(gameData.achievements[0]);
    bonus_multiplier=parseFloat(gameData.achievements[1]);
    researchList=gameData.achievements[2];
    research_playhead=gameData.achievements[3];
      buildResearchList();
    overdrive_price=Number(gameData.achievements[4]);overdrive_label.text("⌬"+numT(total_money)+"/⌬"+numT(overdrive_price));
    ogr=parseFloat(gameData.achievements[5]);
    researchSeed=parseFloat(gameData.achievements[6]);buildRNG(researchSeed);


    //GENERATOR PRICES (SUPPLY LIMITS)
    one_price=Number(gameData.generators[4]);button_one.text(numT(one_price));
    two_price=Number(gameData.generators[5]);button_two.text(numT(two_price));
    three_price=Number(gameData.generators[6]);button_three.text(numT(three_price));
    four_price=Number(gameData.generators[7]);button_four.text(numT(four_price));

    //GENERATOR BUTTONS
    button1Enable(button_one);if(one_price==1){button_one.attr("class", "button1_genRunning");}
    if(two_price>0){button1Enable(button_two);}else{button1Disable(button_two);}
    if(three_price>0){button1Enable(button_three);}else{button1Disable(button_three);}
    if(four_price>0){button1Enable(button_four);}else{button1Disable(button_four);}

    //init multipliers
    one_init_multiplier=Number(gameData.generators[8]);
    two_init_multiplier=Number(gameData.generators[9]);
    three_init_multiplier=Number(gameData.generators[10]);
    four_init_multiplier=Number(gameData.generators[11]);

    //MULTIPLIERS
    one_multiplier=Number(gameData.generators[12]);one_effectiveness_label.text("["+numT(one_multiplier)+"]");
    two_multiplier=Number(gameData.generators[13]);two_effectiveness_label.text("["+numT(two_multiplier)+"]");
    three_multiplier=Number(gameData.generators[14]);three_effectiveness_label.text("["+numT(three_multiplier)+"]");
    four_multiplier=Number(gameData.generators[15]);four_effectiveness_label.text("["+numT(four_multiplier)+"]");

    one_recent_money=0;
    two_recent_money=0;
    three_recent_money=0;
    four_recent_money=0;

    //UPGRADES DEFAULTS

    one_supply=0;one_supply_label.text(one_supply);
    two_supply=0;two_supply_label.text(two_supply);
    three_supply=0;three_supply_label.text(three_supply);
    four_supply=0;four_supply_label.text(four_supply);

    one_generation=parseInt(gameData.generators[0]);
          one_generation_label.text("Generation " + romanize(one_generation+1));
          if(one_generation>1)one_name_label.text("Electric " + romanize(one_generation));
    two_generation=parseInt(gameData.generators[1]);
          two_generation_label.text("Generation " + romanize(two_generation+1));
          if(two_generation>1)two_name_label.text("Plasma " + romanize(two_generation));
    three_generation=parseInt(gameData.generators[2]);
          three_generation_label.text("Generation " + romanize(three_generation+1));
          if(three_generation>1)three_name_label.text("Nuclear " + romanize(three_generation));
    four_generation=parseInt(gameData.generators[3]);
          four_generation_label.text("Generation " + romanize(four_generation+1));
          if(four_generation>1)four_name_label.text("Gravity " + romanize(four_generation));

          if(one_generation>=generation_limit){one_generation_block.hide();}
          if(two_generation>=generation_limit){two_generation_block.hide();}
          if(three_generation>=generation_limit){three_generation_block.hide();}
          if(four_generation>=generation_limit){four_generation_block.hide();}

    one_ratio_label.text("0.0%");
    two_ratio_label.text("0.0%");
    three_ratio_label.text("0.0%");
    four_ratio_label.text("0.0%");

    //generator prices

    one_upgrade_supply_limit_price=Number(gameData.prices[0]);
          one_upgrade_supply_limit.text("⌬" + numT(one_upgrade_supply_limit_price));
    two_upgrade_supply_limit_price=Number(gameData.prices[1]);
          two_upgrade_supply_limit.text("⌬" + numT(two_upgrade_supply_limit_price));
    three_upgrade_supply_limit_price=Number(gameData.prices[2]);
          three_upgrade_supply_limit.text("⌬" + numT(three_upgrade_supply_limit_price));
    four_upgrade_supply_limit_price=Number(gameData.prices[3]);
          four_upgrade_supply_limit.text("⌬" + numT(four_upgrade_supply_limit_price));

    one_upgrade_effectiveness_price=Number(gameData.prices[4]);
          one_upgrade_effectiveness.text("⌬" + numT(one_upgrade_effectiveness_price));
    two_upgrade_effectiveness_price=Number(gameData.prices[5]);
          two_upgrade_effectiveness.text("⌬" + numT(two_upgrade_effectiveness_price));
    three_upgrade_effectiveness_price=Number(gameData.prices[6]);
          three_upgrade_effectiveness.text("⌬" + numT(three_upgrade_effectiveness_price));
    four_upgrade_effectiveness_price=Number(gameData.prices[7]);
          four_upgrade_effectiveness.text("⌬" + numT(four_upgrade_effectiveness_price));

    //generator generations (each next is x1000)
    one_upgrade_generation_price=Number(gameData.prices[8]);
          one_upgrade_generation.text("⌬" + numT(one_upgrade_generation_price));
    two_upgrade_generation_price=Number(gameData.prices[9]);
          two_upgrade_generation.text("⌬" + numT(two_upgrade_generation_price));
    three_upgrade_generation_price=Number(gameData.prices[10]);
          three_upgrade_generation.text("⌬" + numT(three_upgrade_generation_price));
    four_upgrade_generation_price=Number(gameData.prices[11]);
          four_upgrade_generation.text("⌬" + numT(four_upgrade_generation_price));

          //check if the next iteration puts the price over the next generation price and hide the button. This is done in LoadGame(), but not in Init(), because this situation cannot occur after a reset
          if(one_upgrade_effectiveness_price + one_upgrade_effectiveness_price*egr>one_upgrade_generation_price){
            one_upgrade_effectiveness.css("visibility", "hidden");
            if(one_generation>=generation_limit){one_effectiveness_block.hide();}
          }
          if(two_upgrade_effectiveness_price + two_upgrade_effectiveness_price*egr>two_upgrade_generation_price){
            two_upgrade_effectiveness.css("visibility", "hidden");
            if(two_generation>=generation_limit){two_effectiveness_block.hide();}
          }
          if(three_upgrade_effectiveness_price + three_upgrade_effectiveness_price*egr>three_upgrade_generation_price){
            three_upgrade_effectiveness.css("visibility", "hidden");
            if(three_generation>=generation_limit){three_effectiveness_block.hide();}
          }
          if(four_upgrade_effectiveness_price + four_upgrade_effectiveness_price*egr>four_upgrade_generation_price){
            four_upgrade_effectiveness.css("visibility", "hidden");
            if(four_generation>=generation_limit){four_effectiveness_block.hide();}
          }

          //we need to get supply_base first
          if(gameData.upgrade_pbs[12]){
            supply_base=parseInt(gameData.upgrade_pbs[12]);
            one_price_label.text("["+supply_base+"]");
            two_price_label.text("["+supply_base+"]");
            three_price_label.text("["+supply_base+"]");
            four_price_label.text("["+supply_base+"]");
          }else{supply_base=1;}

    //UPGRADE STAGES
    var label="";
    one_upgrade_supply_limit_stage=parseInt(gameData.upgrade_pbs[0]);
          if(one_upgrade_supply_limit_stage==80){label="x2";}
          else{label="+"+supply_base;}
          progress3(one_upgrade_supply_limit_stage,pb_one_upgrade_supply_limit,pb_one_supply_indicator,label);
    two_upgrade_supply_limit_stage=parseInt(gameData.upgrade_pbs[1]);
          if(two_upgrade_supply_limit_stage==80){label="x2";}
          else{label="+"+supply_base;}
          progress3(two_upgrade_supply_limit_stage,pb_two_upgrade_supply_limit,pb_two_supply_indicator,label);
    three_upgrade_supply_limit_stage=parseInt(gameData.upgrade_pbs[2]);
          if(three_upgrade_supply_limit_stage==80){label="x2";}
          else{label="+"+supply_base;}
          progress3(three_upgrade_supply_limit_stage,pb_three_upgrade_supply_limit,pb_three_supply_indicator,label);
    four_upgrade_supply_limit_stage=parseInt(gameData.upgrade_pbs[3]);
          if(four_upgrade_supply_limit_stage==80){label="x2";}
          else{label="+"+supply_base;}
          progress3(four_upgrade_supply_limit_stage,pb_four_upgrade_supply_limit,pb_four_supply_indicator,label);

    one_upgrade_effectiveness_level=parseInt(gameData.upgrade_pbs[8]);
    two_upgrade_effectiveness_level=parseInt(gameData.upgrade_pbs[9]);
    three_upgrade_effectiveness_level=parseInt(gameData.upgrade_pbs[10]);
    four_upgrade_effectiveness_level=parseInt(gameData.upgrade_pbs[11]);




    one_upgrade_effectiveness_stage=parseInt(gameData.upgrade_pbs[4]);
          if(one_upgrade_effectiveness_stage==96){
            if(one_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
          }
          else{label="+"+numT(one_init_multiplier);}
          progress3(one_upgrade_effectiveness_stage,pb_one_upgrade_effectiveness,pb_one_effectiveness_indicator,label);
          if(one_upgrade_effectiveness_level % 2 === 0){sup_one_label.text("x100");}
          else{sup_one_label.text("x5");}
    two_upgrade_effectiveness_stage=parseInt(gameData.upgrade_pbs[5]);
          if(two_upgrade_effectiveness_stage==96){
            if(two_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
          }
          else{label="+"+numT(two_init_multiplier);}
          progress3(two_upgrade_effectiveness_stage,pb_two_upgrade_effectiveness,pb_two_effectiveness_indicator,label);
          if(two_upgrade_effectiveness_level % 2 === 0){sup_two_label.text("x100");}
          else{sup_two_label.text("x5");}
    three_upgrade_effectiveness_stage=parseInt(gameData.upgrade_pbs[6]);
          if(three_upgrade_effectiveness_stage==96){
            if(three_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
          }
          else{label="+"+numT(three_init_multiplier);}
          progress3(three_upgrade_effectiveness_stage,pb_three_upgrade_effectiveness,pb_three_effectiveness_indicator,label);
          if(three_upgrade_effectiveness_level % 2 === 0){sup_three_label.text("x100");}
          else{sup_three_label.text("x5");}
    four_upgrade_effectiveness_stage=parseInt(gameData.upgrade_pbs[7]);
          if(four_upgrade_effectiveness_stage==96){
            if(four_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
          }
          else{label="+"+numT(four_init_multiplier);}
          progress3(four_upgrade_effectiveness_stage,pb_four_upgrade_effectiveness,pb_four_effectiveness_indicator,label);
          if(four_upgrade_effectiveness_level % 2 === 0){sup_four_label.text("x100");}
          else{sup_four_label.text("x5");}


          if(gameData.ui[19]){
            tank_toggle_flag=gameData.ui[19];
          }

          //tank prices
          if(tank_toggle_flag[0]==1){
            one_tank_toggle.html('[1/<span class="blue">full</span>]');
            setTankPrice(0);
          }else{
            power_price_check[0]=one_upgrade_effectiveness_price;
          }
          if(tank_toggle_flag[1]==1){
            two_tank_toggle.html('[1/<span class="blue">full</span>]');
            setTankPrice(1);
          }else{
            power_price_check[1]=two_upgrade_effectiveness_price;
          }
          if(tank_toggle_flag[2]==1){
            three_tank_toggle.html('[1/<span class="blue">full</span>]');
            setTankPrice(2);
          }else{
            power_price_check[2]=three_upgrade_effectiveness_price;
          }
          if(tank_toggle_flag[3]==1){
            four_tank_toggle.html('[1/<span class="blue">full</span>]');
            setTankPrice(3);
          }else{
            power_price_check[3]=four_upgrade_effectiveness_price;
          }




          //these values are read here, because we need them to persist between warps; none of the machines are unlocked after warp, so keeping these values behind machine state conditions will mean that if you reload the page before unlocking any of the machines, the values won't be read and might end up overwritten with default or undefined values
          gambling_choice=gameData.gambling[0];
          gambling_boosts=parseInt(gameData.gambling[1]);

          //MACHINE STATES
          battery_state=parseInt(gameData.machine_states[0]);
              if(battery_state==1){

                batteryInit();

                charge_limit=Number(gameData.battery[1]);charge_limit_label.text("["+numT(charge_limit)+"]");
                charge_limit_upgrade_price=Number(gameData.battery[3]);charge_limit_upgrade.text("⑂" + numT(charge_limit_upgrade_price));
                charge_throughput_upgrade_price=Number(gameData.battery[5]);charge_throughput_upgrade.text("⑂" + numT(charge_throughput_upgrade_price));
                charge=Number(gameData.battery[0]);progress_battery();

                  //animal multipler
                  if((animal7_battery_charge_multiplier-1)>0){animal7_battery_charge_multiplier_label.text('+'+(Math.round((animal7_battery_charge_multiplier-1)*100))+'%');}else{animal7_battery_charge_multiplier_label.text('');}

                battery_charge_percentage_limit=parseInt(gameData.battery[4]);charge_throughput_label.text("["+battery_charge_percentage_limit+"%]");
                battery_charge_percentage=parseInt(gameData.battery[2]);battery_charge_percentage_label.text(battery_charge_percentage+"%");

                if(battery_charge_percentage_limit>=100){charge_throughput_upgrade.hide();}

              }else{//if not, then set up the proper unlock price
                battery_unlock_upgrade_price=Math.pow(10,13);battery_unlock_upgrade.text("⌬" + numT(battery_unlock_upgrade_price));
              }
          magnetron_state=parseInt(gameData.machine_states[1]);
          //relevant prestige items
          warp_max_magnetron_duration=parseInt(gameData.prestige[6]);
          warp_max_magnetron_multiplier=parseInt(gameData.prestige[7]);
          warp_magnetron_alerting=parseInt(gameData.prestige[8]);
              if(magnetron_state>0){

                magnetronInit();

                //magnetronInit sets magnetron_state to 1 and disables the button, so we re-read magnetron's state from the savefile and re-enable the button. However, magnetron_state=3 (when the magnetron is running) is not restored
                if(parseInt(gameData.machine_states[1])==2){
                  magnetron_state=2;
                  magnetron_buttonEnable();
                  gambling_collect_upgrade.removeClass('button11').addClass('selected11');
                }

                device_magnetron_multiplier=parseInt(gameData.magnetron[0]);magnetron_multiplier_label.text("[x"+device_magnetron_multiplier+"]");
                magnetron_button.text("x"+device_magnetron_multiplier);
                  //animal multipler
                  if(animal3_magnetron_multiplier>0){animal3_magnetron_multiplier_label.text('+'+animal3_magnetron_multiplier);}
                  else{animal3_magnetron_multiplier_label.text('');}
                magnetron_multiplier_upgrade_price=Number(gameData.magnetron[2]);magnetron_multiplier_upgrade.text("⑂" + numT(magnetron_multiplier_upgrade_price));
                if(device_magnetron_multiplier>=warp_max_magnetron_multiplier){magnetron_multiplier_upgrade.hide();}//then we hide the button

                magnetron_duration=parseInt(gameData.magnetron[1]);magnetron_duration_label.text("["+magnetron_duration+" sec]");
                  //animal multipler
                  if(animal2_magnetron_duration>0){animal2_magnetron_duration_label.text('+'+animal2_magnetron_duration);}
                  else{animal2_magnetron_duration_label.text('');}
                magnetron_duration_upgrade_price=Number(gameData.magnetron[3]);magnetron_duration_upgrade.text("⑂" + numT(magnetron_duration_upgrade_price));
                if(magnetron_duration>=warp_max_magnetron_duration){magnetron_duration_upgrade.hide();}

                magnetron_button.text("x"+(device_magnetron_multiplier+animal3_magnetron_multiplier));

                magnetron_choice=parseInt(gameData.magnetron[4]);
                if(magnetron_choice!=999){
                  magnetron_probability_game_label.text(''+magnetron_probability_game_set[magnetron_choice]+' '+magnetron_probability_game_set[magnetron_choice]+' '+magnetron_probability_game_set[magnetron_choice]+' '+magnetron_probability_game_set[magnetron_choice]+'');
                }

                //this is done here to override the default value that might be given in gamblingInit()
                //gambling_choice=gameData.gambling[0];//these values are read just outside the machines block
                //gambling_boosts=parseInt(gameData.gambling[1]);//these values are read just outside the machines block
                gambling_collect_flag=parseInt(gameData.gambling[2]);

                if(gambling_choice.length>0){
                  let q1=magnetron_probability_game_set[gambling_choice[0]];
                  let q2=magnetron_probability_game_set[gambling_choice[1]];if(!q2){q2='';}
                  let q3=magnetron_probability_game_set[gambling_choice[2]];if(!q3){q3='';}

                  gambling_symbol_label.html( '<span class="blue" style="visibility:visible">'+q1+q2+q3+'</span>');
                }else{
                  gambling_symbol_label.html( '<span class="blue" style="visibility:hidden">⍙</span>');
                }

                gambling_boosts_label.text('['+gambling_boosts+']');
                if(gambling_boosts>0){button2Enable(gambling_boosts_upgrade);}
                else{button2Disable(gambling_boosts_upgrade);}

                if(gambling_collect_flag==0){
                  gambling_collect_upgrade.removeClass('button11').addClass('selected11');
                }else{
                  gambling_collect_upgrade.removeClass('selected11').addClass('button11');
                }


              }else{//if not, then set up the proper unlock price
                //I had a line here, but actually the previous machine's Init function will set this price properly
              }
          foundry_state=parseInt(gameData.machine_states[2]);
              if(foundry_state==1){

                var foundry_label;

                foundryInit();

                foundry_components=Number(gameData.foundry[0]);foundry_components_label.text("⯎" + numT(foundry_components));
                foundry_components_multiplier=Number(gameData.foundry[1]);foundry_components_multiplier_label.text("["+numT(foundry_components_multiplier*foundry_components_multiplier_qm)+"]");

                //animal multipler
                if((animal6_components_multiplier-1)>0){animal6_components_multiplier_label.text('+'+(Math.round((animal6_components_multiplier-1)*100))+'%');}else{animal6_components_multiplier_label.text('');}

                foundry_components_cycle_upgrade_price=Number(gameData.foundry[2]);foundry_components_cycle_upgrade.text("⑂" + numT(foundry_components_cycle_upgrade_price));

                fccu_stage=parseInt(gameData.foundry[3]);
                fccu_level=parseInt(gameData.foundry[4]);

                if(fccu_stage==95){

                  if(fccu_level % 2 === 0){foundry_label="x20";}
                  else{foundry_label="x5";}

                }
                else{foundry_label="+1";}

                progress3(fccu_stage,pb_components_multiplier,pb_components_multiplier_indicator,foundry_label);

                foundry_temperature=parseInt(gameData.foundry[5]);
                foundry_production_flag=parseInt(gameData.foundry[6]);
                furnace_screen.text(foundry_temperature+" °C");

                foundry_waste=Number(gameData.foundry[7]);
                foundry_waste_label.text("⌬"+numT(foundry_waste)+"/⌬"+foundry_waste_limit);

                if(foundry_waste==foundry_waste_limit){
                  button1Enable(foundry_recycle_upgrade);
                }

              }
          radiator_state=parseInt(gameData.machine_states[4]);
                if(radiator_state==1){

                  radiatorInit();

                  radiator_active=parseInt(gameData.radiator[0]);
                  radiator_playhead=parseInt(gameData.radiator[1]);

                  radiatorSwitch();

                  if(radiator_active==1){
                    radiator_button_center.text("ON");
                  }else{
                    radiator_button_center.text("OFF");
                  }

                }
          pc_state=parseInt(gameData.machine_states[5]);
                if(pc_state==1){

                  pcInit();

                  positrons=Number(gameData.pc[0]);
                    pc_positrons_label.text('['+numT(all_time_positrons)+'/'+numT(nextPositronCubesCost)+']');
                  pc_emission=Number(gameData.pc[1]);
                    pc_emission_label.text('[1-'+numT(pc_emission*pc_emission_boost)+']');
                  pc_emission_upgrade_price=Number(gameData.pc[2]);
                    pc_emission_upgrade.text( "⯎" +  numT(pc_emission_upgrade_price) );

                }else{nPCC();}//so that if pc is not yet activated, we still update the number of positron blocks in the header

                //done after all machine init functions to override default minimize values
                battery_min_flag=parseInt(gameData.ui[13]);
                    if(battery_min_flag==0){battery_body.show();}
                    else{battery_body.hide();}
                magnetron_min_flag=parseInt(gameData.ui[14]);
                    if(magnetron_min_flag==0){magnetron_body.show();}
                    else{magnetron_body.hide();}
                gambling_min_flag=parseInt(gameData.ui[18]);
                    if(gambling_min_flag==0){gambling_body.show();}
                    else{gambling_body.hide();}
                foundry_min_flag=parseInt(gameData.ui[15]);
                    if(foundry_min_flag==0){foundry_body.show();}
                    else{foundry_body.hide();}
                radiator_min_flag=parseInt(gameData.ui[16]);
                    if(radiator_min_flag==0){radiator_body.show();}
                    else{radiator_body.hide();}
                pc_min_flag=parseInt(gameData.ui[17]);
                    if(pc_min_flag==0){pc_body.show();}
                    else{pc_body.hide();}


              //upgrades related to rank (engineering den and lifeforms scanner)
              engden_state=parseInt(gameData.engden[0]);
                  if(engden_state==0){
                    //auxiliary_effectiveness=1;
                    engden_title.hide();
                    engden_block.hide();
                    rank_label.text("[Operator]");
                  }else{
                    engden_title.show();
                    engden_block.show();
                    rank_label.text("[Engineer]");
                  }
              lscanner_state=parseInt(gameData.machine_states[3]);
                  if(lscanner_state==0){
                    lscanner_title.hide();
                    lscanner_block.hide();
                  }else{
                    lscanner_title.show();
                    lscanner_block.show();
                    rank_label.text("[Floor Admin]");
                  }



    //CONTROL PANEL
    one_tab.css("background-color","#30b8d0");one_tab.css("color","#1a1a1a");
    two_tab.css("background-color","#1a1a1a");two_tab.css("color","#999");
    three_tab.css("background-color","#1a1a1a");three_tab.css("color","#999");
    four_tab.css("background-color","#1a1a1a");four_tab.css("color","#999");

    one_tab_contents.show();
    two_tab_contents.hide();
    three_tab_contents.hide();
    four_tab_contents.hide();

    //bonusbox.hide();bonusbox_window_flag=0;

    //OPTIMIZATIONS
    active_tab_flag=1;
    one_ratios_flag=1;//1 by default, so that starting the generator recalculates the ratios
    two_ratios_flag=1;
    three_ratios_flag=1;
    four_ratios_flag=1;

    //GENERATOR STRIPS
    one_x=0;two_x=0;three_x=0;four_x=0;
    g_electric.css('background-image', 'url("img/g_electric2.png")');
    g_plasma.css('background-image', 'url("img/g_plasma2.png")');
    g_nuclear.css('background-image', 'url("img/g_nuclear2.png")');
    g_gravity.css('background-image', 'url("img/g_gravity2.png")');

    //PRESTIGE ITEMS that are not specific to machines; machine-specific prestige items are loaded before their relevant sections ^^^
    prestige_multiplier=Number(gameData.prestige[0]);
    antimatter=Number(gameData.prestige[1]);
    all_time_antimatter=Number(gameData.prestige[2]);
    antimatter_cubes=Number(gameData.prestige[3]);
    antimatter_cubes_spent=Number(gameData.prestige[4]);
    warp_price=Number(gameData.prestige[12]);
    warp_rank1_training1_flag=Number(gameData.prestige[13]);
    warp_rank2_training1_flag=Number(gameData.prestige[14]);
    warp_rank2_training2_flag=Number(gameData.prestige[15]);

    //6,7,8 are magnetron values and are used in the magnetron section above
    warp_panel1_upgrade_flag=parseInt(gameData.prestige[9]);
      //if(warp_panel1_upgrade_flag==1){
        sup_one_label.show();
        sup_two_label.show();
        sup_three_label.show();
        sup_four_label.show();
      //}
    warp_panel2_upgrade_flag=parseInt(gameData.prestige[10]);
      if(warp_panel2_upgrade_flag==1){
        buymax_toggle.show();
      }
    warp_panel3_upgrade_flag=parseInt(gameData.prestige[11]);
      if(warp_panel3_upgrade_flag==1){
        rlab_autobuy_toggle.show();
      }
    warp_panel4_upgrade_flag=parseInt(gameData.prestige[5]);
      if(warp_panel4_upgrade_flag==1){
        machines_buymax_toggle.show();
      }

      antimatter_label.text(numT(antimatter));


    //AUDIO
    audio_mute=parseInt(gameData.ui[0]);
          if(audio_mute==0){
            audio_toggle.text("Mute audio");
            button3Green(audio_toggle);
          }else{
            audio_toggle.text("Unmute audio");
            button3Red(audio_toggle);
          }
    audio_mute_one=parseInt(gameData.ui[1]);
          if(audio_mute_one==0){
            audio_toggle_one.text("Mute Electric");
            button3Green(audio_toggle_one);
          }else{
            audio_toggle_one.text("Unmute Electric");
            button3Red(audio_toggle_one);
          }
    audio_mute_two=parseInt(gameData.ui[2]);
          if(audio_mute_two==0){
            audio_toggle_two.text("Mute Plasma");
            button3Green(audio_toggle_two);
          }else{
            audio_toggle_two.text("Unmute Plasma");
            button3Red(audio_toggle_two);
          }
    audio_mute_three=parseInt(gameData.ui[3]);
          if(audio_mute_three==0){
            audio_toggle_three.text("Mute Nuclear");
            button3Green(audio_toggle_three);
          }else{
            audio_toggle_three.text("Unmute Nuclear");
            button3Red(audio_toggle_three);
          }
    audio_mute_four=parseInt(gameData.ui[4]);
          if(audio_mute_four==0){
            audio_toggle_four.text("Mute Gravity");
            button3Green(audio_toggle_four);
          }else{
            audio_toggle_four.text("Unmute Gravity");
            button3Red(audio_toggle_four);
          }
    audio_mute_allgen=parseInt(gameData.ui[5]);
          if(audio_mute_allgen==0){
            audio_toggle_allgen.text("Mute All");
            button3Green(audio_toggle_allgen);
          }else{
            audio_toggle_allgen.text("Unmute All");
            button3Red(audio_toggle_allgen);
          }
    audio_volume=parseFloat(gameData.ui[6]);
    Howler.volume(audio_volume);
    audio_control_volume.val(audio_volume);



    if(powerplants_multiplier>1){
      aa_panel.html("x" + numT(prestige_multiplier) + '<span style="color:#aaa">x' + numT(powerplants_multiplier) + '</span');
    }else{
      aa_panel.text("x" + numT(prestige_multiplier));
    }



    rlab_panel.text( "+" +  numT( (bonus_multiplier+animal1_bonus_multiplier-1)*100 ) + "%" );

    night_shift=parseInt(gameData.ui[8]);
            if(night_shift==1){
              night_shift_toggle.attr("class", "engden_on").text("ON");
              //overdrive_panel.hide();
            }else{
              night_shift_toggle.attr("class", "engden_off").text("OFF");
              //overdrive_panel.show();
            }

    buymax_toggle_flag=parseInt(gameData.ui[9]);
            if(buymax_toggle_flag==1){
              buymax_toggle.html('[<span class="purple">auto</span>]');
            }else{
              buymax_toggle.html('[auto]');
            }

    rlab_autobuy_toggle_flag=parseInt(gameData.ui[10]);
            if(rlab_autobuy_toggle_flag==1){
              rlab_autobuy_toggle.html('[<span class="purple">auto</span>]');
            }

    machines_buymax_toggle_flag=parseInt(gameData.ui[11]);
            if(machines_buymax_toggle_flag==1){
              machines_buymax_toggle.html('[1/<span class="purple">max</span>]');
            }

    //multipliers that are always part of moneyCalc set to default values
    magnetron_multiplier=1;

    //doing this at the end, so that we override some of the buymax toggles if need be
    if(chief==1){//chief is taken from the save in the beginning of LoadGame(), with the other player variables
      chief_check=0;//this needs to be set to 0, otherwise no sound. Player needs to interact with the UI first
      chief_warp_check=parseInt(gameData.ui[7]);
      rank_label.text("[Chief Engineer]");
      chief_cc_block.show();
      ccSetup();
    }else{
      chief_cc_block.hide();
    }

    //updating UI with the established values
    InventoryUpdate();
    factoryState();//because it is called in Inventory only if battery_charge_percentage is over 0, which might not be the case on load

    buildResearchList();

    //starting the Grand Telescope
    startTelescope();

    if(antimatter_cubes==0 && antimatter>100){
      document.title = "Warpless Machinery ["+version+"]";
      document.body.style.backgroundImage = 'url("img/wild_oliva_dark.png")';
    }



    //if we would want to start the generators as soon as the game is loaded, we would need to do a popup that the player has to click away, otherwise the browser will block audio; but then if there's a popup, why not just let the player restart everything? They just need to hit "r"
    //restartGenerators();

    clearInterval(save_timer);
    save_timer_label.text(120);
    button3Disable(save_upgrade);
    SaveLoop();

  }
  function SaveLoop(){

    //this is one the only two functions that automatically triggers save, the other being magnetronRequest() with Synchrotron enabled (to prevent cheating). No other automatic functions or processes in the game will save the game. The only other way to save is for the player to hit the save_upgrade button.

    save_sec=120;

    if(!save_timer){
      save_timer=setInterval(function() {

        save_sec--;
        if(save_sec==0){
          save_sec=120;
          SaveGame();
          button3Disable(save_upgrade);
        }

        if(save_sec==115){button3Enable(save_upgrade);}

        save_timer_label.text(save_sec);

      }, 1000);
    }

  }

  function button1Enable($element){
    //$element.prop('disabled', false).removeClass('disabled1').addClass('button1');
    $element.prop('disabled', false).attr("class", "button1");
  }
  function button1Disable($element){
    $element.prop('disabled', true).attr("class", "disabled1");
  }
  function button2Enable($element){
    $element.prop('disabled', false).removeClass('disabled2').addClass('button2');
  }
  function button2Disable($element){
    $element.prop('disabled', true).removeClass('button2').addClass('disabled2');
  }
  function button3Enable($element){
    $element.prop('disabled', false).removeClass('disabled3').addClass('button3');
  }
  function button3Disable($element){
    $element.prop('disabled', true).removeClass('button3').addClass('disabled3');
  }
  function button3Green($element){
    $element.removeClass('button3red').addClass('button3green');
  }
  function button3Red($element){
    $element.removeClass('button3green').addClass('button3red');
  }
  function button7Enable($element){
    $element.prop('disabled', false).removeClass('disabled7').addClass('button7');
  }
  function button7Disable($element){
    $element.prop('disabled', true).removeClass('button7').addClass('disabled7');
  }
  function button8Enable($element){
    $element.prop('disabled', false).removeClass('disabled8').addClass('button8');
  }
  function button8Disable($element){
    $element.prop('disabled', true).removeClass('button8').addClass('disabled8');
  }
  function button10Enable($element){
    $element.prop('disabled', false).removeClass('disabled10').removeClass('activated10').addClass('button10');
  }
  function button10Disable($element){
    $element.prop('disabled', true).removeClass('button10').removeClass('activated10').addClass('disabled10');
  }
  function magnetron_buttonEnable(){
    magnetron_button.prop('disabled', false).removeClass('magnetron_button_disarmed').addClass('magnetron_button_armed');
  }
  function magnetron_buttonActiveDisabled(){//the button is disabled, but we make sure that the button looks active
    magnetron_button.prop('disabled', true).removeClass('magnetron_button_armed').addClass('magnetron_button_timer');
  }
  function magnetron_buttonDisable(){
    magnetron_button.prop('disabled', true).removeClass('magnetron_button_timer').removeClass('magnetron_button_armed').addClass('magnetron_button_disarmed');
  }
  function bonusEnable($element){
    $element.prop('disabled', false).removeClass('bonusbox_disabled').addClass('bonusbox');
  }
  function bonusDisable($element){
    $element.prop('disabled', true).removeClass('bonusbox').addClass('bonusbox_disabled');
  }
  function redToGreen($element){
    $element.removeClass('red').addClass('green');
  }
  function greenToRed($element){
    $element.removeClass('green').addClass('red');
  }
  function silverToRedBold($element){

    $element.removeClass('silver').addClass('red_bold');
  }
  function redBoldToSilver($element){

    $element.removeClass('red_bold').addClass('silver');
  }

  //this is done due to the behavior of progress bars, which don't seem to be visually updated if the div of the tab is hidden; therefore, I call these functions in color_block. The problem would be especially noticeable when auto-buy is on
  //the downside of this solution is that it duplicates code from the x_upgrade_effectiveness functions and in theory I could've simply moved all the UI functions here, so that I call these functions as well. The pedantic upside is that I've removed a couple of calls in these ones
  function pbRefreshOne(){
    var label;

    //power pb

    if(one_upgrade_effectiveness_level % 2 === 0){sup_one_label.text("x100");}
    else{sup_one_label.text("x5");}

    if(one_upgrade_effectiveness_stage==96){//multiplier labels
            if(one_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
    }
    else{label="+"+numT(one_init_multiplier);}

    progress3(one_upgrade_effectiveness_stage,pb_one_upgrade_effectiveness,pb_one_effectiveness_indicator,label);

    //supply pb

    if(one_upgrade_supply_limit_stage==80){label="x2";}
      else{label="+"+supply_base;}

    progress3(one_upgrade_supply_limit_stage,pb_one_upgrade_supply_limit,pb_one_supply_indicator,label);

  }
  function pbRefreshTwo(){
    var label;

    //power pb

    if(two_upgrade_effectiveness_level % 2 === 0){sup_two_label.text("x100");}
    else{sup_two_label.text("x5");}

    if(two_upgrade_effectiveness_stage==96){//multiplier labels
            if(two_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
    }
    else{label="+"+numT(two_init_multiplier);}

    progress3(two_upgrade_effectiveness_stage,pb_two_upgrade_effectiveness,pb_two_effectiveness_indicator,label);

    //supply pb

    if(two_upgrade_supply_limit_stage==80){label="x2";}
    else{label="+"+supply_base;}

    progress3(two_upgrade_supply_limit_stage,pb_two_upgrade_supply_limit,pb_two_supply_indicator,label);

  }
  function pbRefreshThree(){
    var label;

    //power pb

    if(three_upgrade_effectiveness_level % 2 === 0){sup_three_label.text("x100");}
    else{sup_three_label.text("x5");}

    if(three_upgrade_effectiveness_stage==96){//multiplier labels
            if(three_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
    }
    else{label="+"+numT(three_init_multiplier);}

    progress3(three_upgrade_effectiveness_stage,pb_three_upgrade_effectiveness,pb_three_effectiveness_indicator,label);

    //supply pb

    if(three_upgrade_supply_limit_stage==80){label="x2";}
    else{label="+"+supply_base;}

    progress3(three_upgrade_supply_limit_stage,pb_three_upgrade_supply_limit,pb_three_supply_indicator,label);

  }
  function pbRefreshFour(){
    var label;

    //power pb

    if(four_upgrade_effectiveness_level % 2 === 0){sup_four_label.text("x100");}
    else{sup_four_label.text("x5");}

    if(four_upgrade_effectiveness_stage==96){//multiplier labels
            if(four_upgrade_effectiveness_level % 2 === 0){label="x100";}
            else{label="x5";}
    }
    else{label="+"+numT(four_init_multiplier);}

    progress3(four_upgrade_effectiveness_stage,pb_four_upgrade_effectiveness,pb_four_effectiveness_indicator,label);

    //supply pb

    if(four_upgrade_supply_limit_stage==80){label="x2";}
    else{label="+"+supply_base;}

    progress3(four_upgrade_supply_limit_stage,pb_four_upgrade_supply_limit,pb_four_supply_indicator,label);

  }

  function closeWindows(){//closes all the windows
    settings_infobox.hide();settings_window_flag=0;
    reset_infobox.hide();reset_window_flag=0;
    stats_infobox.hide();stats_window_flag=0;
    prestige_infobox.hide();prestige_window_flag=0;
    rank_infobox.hide();rankinfo_window_flag=0;
    magicnumber_infobox.hide();magicnumber_window_flag=0;
    incorrectsave_infobox.hide();
  }
  function windowScroll(){
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }
  function warpViewWarning(){
    PlayAudio(11);warp_view_warning.show();
  }

  function restartGenerators(){
    //setTimeout separates the starts of generators. Random values are added to add variety, so that each time the generators are restarted automatically, you get a slightly different pattern
    if(one_price>0){
      one_supply=one_price;clearInterval(one_interval);
      button_one.attr("class", "button1_genRunning");
      One();
    }
    if(two_price>0){
      two_supply=two_price;
      button_two.attr("class", "button1_genRunning");//120 (these are baseline values around which we add variation)
      //it is important to pair clearInterval with calling the function, since setTimeout is an async function and you don't want to spawn rogue intervals
      setTimeout( function () { clearInterval(two_interval); Two(); }, Math.floor((Math.random() * 100) +100) );
      //Two();
    }
    if(three_price>0){
      three_supply=three_price;
      button_three.attr("class", "button1_genRunning");//240
      setTimeout(function () { clearInterval(three_interval); Three(); },Math.floor((Math.random() * 100) +220));
      //Three();
    }
    if(four_price>0){
      four_supply=four_price;
      button_four.attr("class", "button1_genRunning");//480
      setTimeout(function () { clearInterval(four_interval); Four(); },Math.floor((Math.random() * 100) +450));
    }

  }
  function stopGenerators(){

    //because restartGenerators() uses setTimeout, which is an async function, clearing interval normally might not work, since there are many times in a game where restartGenerators() might be called around the when the player presses [Warp]. If this happens, some of the generators will be restarted by setTimeout after and the player will hear sounds of generators at the prestige screen.
    //in order to fix that, we remove all the conditions which might cause the game to call restartGenerators while also setting all supply variables to 0, which will clear all unstopped intervals after one cycle.

    autobuy_purse=[0,0,0];//resetting helper array

    //saving values in the helper
    autobuy_purse[0]=buymax_toggle_flag;
    autobuy_purse[1]=rlab_autobuy_toggle_flag;
    autobuy_purse[2]=night_shift;

    //turning off all auto-buy options, ensuring restartGenerators() won't be triggered
    buymax_toggle_flag=0;
    rlab_autobuy_toggle_flag=0;
    night_shift=0;

    //turning off all the intervals
    one_supply=0;
    two_supply=0;
    three_supply=0;
    four_supply=0;
    clearInterval(one_interval);
    clearInterval(two_interval);
    clearInterval(three_interval);
    clearInterval(four_interval);

  }

  function countQUF(bag){

    var count=0;

    for (let i = 0; i < 6; i++) {

      if(bag[i]==1){
        count++;
      }

    }

    //buff challenge removes the QUF limitation, but also makes sure that it doesn't allow one to start with no QU
    if(buff_challenge1_flag==2 && count>1){count=1;}

    return count;
  }

  function numT(number, decPlaces=2) { //numTransform

    //my optimization: it used to do abbrev.length in two places, since the length here is not variable, I cache it. Performance boost is likely to be very small, but as this is one of the most used functions in the game, I want to make sure it is ultra-optimized

    if(scientific_ui==0){

    var abbrev_length=64;

            number = Math.round(number*100)/100;//my addition: round any incoming floats first

  					// 2 decimal places => 100, 3 => 1000, etc
  					decPlaces = Math.pow(10,decPlaces);
  					// Enumerate number abbreviations
  					var abbrev = [ "k", "M", "B", "T", "Q", "kQ", "S", "kS", "c", "kc", "d", "kd", "e", "ke", "f", "kf", "F", "kF", "h", "kh", "j", "kj", "L", "kL", "Na", "kNa", "Nb", "kNb", "Nc", "kNc", "Nd", "kNd", "Ne", "kNe", "Nf", "kNf", "Ng", "kNg", "Nh", "kNh", "Ni", "kNi", "Nj", "kNj", "Nk", "kNk", "Nl", "kNl", "Nm", "kNm", "Np", "kNp", "Nq", "kNq", "Nr", "kNr", "Ns", "kNs", "Nt", "kNt", "Nu", "kNu", "Nv", "inf" ];

  					// Go through the array backwards, so we do the largest first
  					for (var i=abbrev_length-1; i>=0; i--) {
  							// Convert array index to "1000", "1000000", etc
  							var size = Math.pow(10,(i+1)*3);
  							// If the number is bigger or equal do the abbreviation
  							if(size <= number) {
  									 // Here, we multiply by decPlaces, round, and then divide by decPlaces.
  									 // This gives us nice rounding to a particular decimal place.
  									 number = Math.round(number*decPlaces/size)/decPlaces;
  									 // Handle special case where we round up to the next abbreviation
  									 if((number == 1000) && (i < abbrev_length - 1)) {
  											 number = 1;
  											 i++;
  									 }
  									 // Add the letter for the abbreviation
  									 number += ""+abbrev[i];
  									 // We are done... stop
  									 break;
  							}
  					}

          }else{
            if(number>1000){return Number(number).toExponential(2).replace(/\+/g, "");}
            else{number = Math.round(number*100)/100;}
          }

  					return number;
  		}
  function romanize(num) {
  	if (!+num)
  		return false;
  	var	digits = String(+num).split(""),
  		key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
  		       "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
  		       "","I","II","III","IV","V","VI","VII","VIII","IX"],
  		roman = "",
  		i = 3;
  	while (i--)
  		roman = (key[+digits.pop() + (i * 10)] || "") + roman;
  	return Array(+digits.join("") + 1).join("M") + roman;
  }

  function choose(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
  }
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum and the minimum are inclusive
  }
  function getRandomIntMT(min, max) {
    //will require mT to be initialized first; currently initialized in buildRNG()
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(mT.random() * (max - min + 1) + min); //The maximum and the minimum are inclusive
  }
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
  }



  function testFunc(){

    //testFunc() is used when for testing you need to trigger a bunch of things

    warp_challenge1_flag=1;
    warp_challenge2_flag=1;
    warp_challenge3_flag=1;
    warp_challenge4_flag=1;
    buff_challenge1_flag=1;



  }

  function progress(percent, $element) {
    var progressBarWidth = percent * pb_one_width * 0.01;
    $element.width(progressBarWidth);
  }

  function progress3(percent, $element, $element_indicator, label) {
    var progressBarWidth = percent * $element.width() * 0.01;
    $element_indicator.width(progressBarWidth).html(label);
  }

  function progress_antimatter() {

    var percent = (all_time_money - prevAntimatterCost) / (nextAntimatterCost - prevAntimatterCost) * 100;
    var progressBarWidth = percent * pb_antimatter.width() * 0.01;//have to do width, since it changes based on the amount of antimatter
    pb_antimatter_indicator.width(progressBarWidth);
  }

  function progress_money() {
    var percent= money / money_limit * 100;
    if(percent>100){percent=100;}
    var progressBarWidth = percent * pb_money.width() * 0.01;
    pb_money_indicator.width(progressBarWidth).html("⌬" + numT(money));
  }

  function progress_battery() {
    var percent= charge / charge_limit * 100;
    if(percent>100){percent=100;}
    var progressBarWidth = percent * pb_battery.width() * 0.01;
    pb_battery_indicator.width(progressBarWidth).html("⑂" + numT(charge));
  }

  function GeneratorRatios(){
    var all = one_recent_money + two_recent_money + three_recent_money + four_recent_money;
    if(all==0){all=1;}
    var one_ratio = Number(one_recent_money / all * 100).toFixed(1); one_ratio_label.text(one_ratio+"%");
    var two_ratio = Number(two_recent_money / all * 100).toFixed(1); two_ratio_label.text(two_ratio+"%");
    var three_ratio = Number(three_recent_money / all * 100).toFixed(1); three_ratio_label.text(three_ratio+"%");
    var four_ratio = Number(four_recent_money / all * 100).toFixed(1); four_ratio_label.text(four_ratio+"%");

    eepc_panel.text("⌬"+numT(all*magnetron_multiplier*auxiliary_effectiveness*(bonus_multiplier+animal1_bonus_multiplier)*am_radiation_multiplier));

  }

  function nAC(){//nextAntimatterCost

    if(all_time_money>=nextAntimatterCost){

      let recalculated_ac=Math.floor( Math.cbrt( all_time_money/AM_BASE_COST ) );//recalculating all time antimatter cubes

      all_time_antimatter=recalculated_ac;
      antimatter=recalculated_ac-antimatter_cubes;//this is the amount of antimatter earned this cycle
      antimatter_label.text(numT(antimatter));
      prevAntimatterCost=AM_BASE_COST * Math.pow((all_time_antimatter),3);
    }
    nextAntimatterCost=AM_BASE_COST * Math.pow((all_time_antimatter+1),3);

    if(antimatter_cubes==0){//antimatter spillover effect
      am_radiation_multiplier=Math.floor((antimatter)/100);
      if(am_radiation_multiplier<1){am_radiation_multiplier=1;}
    }

    //updating the progress bar
    progress_antimatter();
  }

  function nPCC(){//nextPositronCubesCost

    if(all_time_positrons>=nextPositronCubesCost){

      all_time_positron_cubes=Math.floor( Math.cbrt( all_time_positrons/POS_BASE_COST ) );;

      let positron_cubes_this_cycle=all_time_positron_cubes-positron_cubes;//this is the amount of positron cubes earned this cycle

      pc_positron_cubes_label.html('&#8984;'+numT(positron_cubes_this_cycle));
      magicnumber_label.text('['+numT(positron_cubes_this_cycle)+']');


      prevPositronCubesCost=POS_BASE_COST * Math.pow((all_time_positron_cubes),3);
    }
    nextPositronCubesCost=POS_BASE_COST * Math.pow((all_time_positron_cubes+1),3);

  }

  function setupAudio(){

    audio_tick2 = new Howl({
      src: ['snd/tick2.wav']
    });

    audio_click4 = new Howl({
      src: ['snd/click4.wav']
    });

    audio_click5 = new Howl({
      src: ['snd/click5.wav']
    });

    audio_pbtick = new Howl({
      src: ['snd/progress_tick2.wav']
    });

    audio_bonus = new Howl({
      src: ['snd/money2.wav']
    });

    audio_alert = new Howl({
      src: ['snd/blip1.wav']
    });

    audio_switch = new Howl({
      src: ['snd/switch2_2.wav']
    });

    audio_rlab = new Howl({
      src: ['snd/rlab_item1_2.wav']
    });

    audio_phum = new Howl({
      src: ['snd/phum_loop.wav']
    });

    audio_tabclick = new Howl({
      src: ['snd/tab_click.wav']
    });

    audio_halt = new Howl({
      src: ['snd/halt.wav']
    });

    audio_coins = new Howl({
      src: ['snd/coins.wav']
    });

    audio_miss = new Howl({
      src: ['snd/miss.wav']
    });

  }

  function PlayAudio(snd){
    if(audio_mute==0){

      if(audio_initiated==0){
        audio_initiated=1;
        setupAudio();
      }

      switch(snd){
        case 1: audio_click4.play(); break;
        case 2: audio_click5.play(); break;
        case 3: audio_tick2.play(); break;
        case 4: audio_pbtick.play(); break;
        case 5: audio_bonus.play(); break;
        case 6: audio_alert.play(); break;
        case 7: audio_switch.play(); break;
        case 8: audio_rlab.play(); break;
        case 9: audio_phum.play(); break;
        case 10: audio_tabclick.play(); break;
        case 11: audio_halt.play(); break;
        case 12: audio_coins.play(); break;
        case 13: audio_miss.play(); break;
        }
    }
    }
